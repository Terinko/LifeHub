import type { ThriftListing } from "@lifehub/shared";
import { HttpError } from "../shared/http";

const SEARCH = "https://poshmark.com/search";
const UNAVAILABLE = "Couldn't get Poshmark sales right now.";

/** Poshmark's condition codes, as the search page reports them. */
const CONDITIONS: Record<string, string> = {
  nwt: "New with tags",
  uln: "Like new",
  ug: "Good",
  uf: "Fair",
};

type RawListing = {
  id?: unknown;
  title?: unknown;
  size?: unknown;
  condition?: unknown;
  picture_url?: unknown;
  status_changed_at?: unknown;
  updated_at?: unknown;
  price_amount?: { val?: unknown };
  inventory?: { status?: unknown; status_changed_at?: unknown };
};

/**
 * The page's state object (window.__INITIAL_STATE__), read by matching
 * braces so a stray "}" inside a string doesn't end it early.
 */
export function initialState(html: string): unknown {
  const marker = html.indexOf("window.__INITIAL_STATE__");
  const start = marker < 0 ? -1 : html.indexOf("{", marker);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      return JSON.parse(html.slice(start, i + 1)) as unknown;
    }
  }
  return null;
}

/** Every object in the state that looks like a listing. */
function findListings(node: unknown, out: RawListing[] = []): RawListing[] {
  if (Array.isArray(node)) {
    for (const child of node) findListings(child, out);
  } else if (node && typeof node === "object") {
    const obj = node as RawListing;
    if (obj.price_amount && obj.title && obj.inventory) out.push(obj);
    else for (const child of Object.values(node)) findListings(child, out);
  }
  return out;
}

const text = (v: unknown) =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

export function toListing(raw: RawListing): ThriftListing | null {
  const id = text(raw.id);
  const title = text(raw.title);
  const price = Number(raw.price_amount?.val);
  if (!id || !title || !(price > 0) || raw.inventory?.status !== "sold_out") {
    return null;
  }
  const condition = text(raw.condition);
  return {
    id,
    title,
    price,
    size: text(raw.size),
    condition: condition ? CONDITIONS[condition] : undefined,
    imageUrl: text(raw.picture_url),
    url: `https://poshmark.com/listing/${id}`,
    soldAt:
      text(raw.inventory?.status_changed_at) ??
      text(raw.status_changed_at) ??
      text(raw.updated_at),
  };
}

/** Recently sold Poshmark listings for a search, newest first as Poshmark sorts them. */
export async function searchSold(query: string): Promise<ThriftListing[]> {
  const url = new URL(SEARCH);
  url.searchParams.set("query", query);
  url.searchParams.set("availability", "sold_out");
  url.searchParams.set("type", "listings");

  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LifeHub/1.0; personal thrift price check)",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      console.error(`Poshmark search answered ${res.status}`);
      throw new HttpError(502, UNAVAILABLE);
    }
    html = await res.text();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error("Poshmark search failed:", error);
    throw new HttpError(502, UNAVAILABLE);
  }

  let state: unknown;
  try {
    state = initialState(html);
  } catch (error) {
    console.error("Couldn't read Poshmark's search page:", error);
  }
  // A page without its data is a challenge or error page, not "no sales".
  if (!state) throw new HttpError(502, UNAVAILABLE);
  const seen = new Set<string>();
  return findListings(state)
    .map(toListing)
    .filter((l): l is ThriftListing => {
      if (!l || seen.has(l.id)) return false;
      seen.add(l.id);
      return true;
    });
}
