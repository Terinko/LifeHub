import type { ThriftListing } from "@lifehub/shared";
import { fetchJson } from "../shared/fetchJson";
import { HttpError } from "../shared/http";

// eBay's Browse API: live listings only. eBay doesn't offer sold listings to
// new developers, and its User Agreement bans scraping them, so the tool
// works from what's for sale now and links out to Terapeak for real sales.
const TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
export const SEARCH_URL =
  "https://api.ebay.com/buy/browse/v1/item_summary/search";
const SCOPE = "https://api.ebay.com/oauth/api_scope";

/** Pre-owned and new-without-tags: what turns up on a thrift rack. */
const CONDITIONS = "conditionIds:{1500|3000}";
const US_ONLY = "priceCurrency:USD,itemLocationCountry:US";

type Money = { value?: string; currency?: string };

export type EbayItemSummary = {
  itemId?: string;
  title?: string;
  price?: Money;
  currentBidPrice?: Money;
  bidCount?: number;
  buyingOptions?: string[];
  itemEndDate?: string;
  itemCreationDate?: string;
  condition?: string;
  image?: { imageUrl?: string };
  thumbnailImages?: { imageUrl?: string }[];
  itemWebUrl?: string;
  shippingOptions?: { shippingCost?: Money }[];
};

export type EbaySearchResponse = {
  total?: number;
  itemSummaries?: EbayItemSummary[];
};

/** The app's eBay keys, or a 503 the app shows as "not connected yet". */
function credentials() {
  const id = process.env.EBAY_CLIENT_ID;
  const secret = process.env.EBAY_CLIENT_SECRET;
  if (!id || !secret) {
    throw new HttpError(503, "eBay isn't connected to LifeHub yet.");
  }
  return { id, secret };
}

export const ebayConfigured = () =>
  !!process.env.EBAY_CLIENT_ID && !!process.env.EBAY_CLIENT_SECRET;

let token: { value: string; expires: number } | undefined;

/** An application token, kept until a minute before it expires. */
async function appToken(): Promise<string> {
  if (token && token.expires > Date.now()) return token.value;
  const { id, secret } = credentials();
  const res = await fetchJson<{ access_token: string; expires_in: number }>(
    TOKEN_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: SCOPE,
      }).toString(),
    },
  );
  token = {
    value: res.access_token,
    expires: Date.now() + (res.expires_in - 60) * 1000,
  };
  return token.value;
}

/** Test hook: forget the token. */
export const clearToken = () => {
  token = undefined;
};

async function search(params: Record<string, string>) {
  const url = `${SEARCH_URL}?${new URLSearchParams(params).toString()}`;
  return fetchJson<EbaySearchResponse>(url, {
    headers: {
      Authorization: `Bearer ${await appToken()}`,
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
    },
  });
}

/** Buy It Now listings for `q`, up to 100. */
export async function searchFixedPrice(q: string): Promise<ThriftListing[]> {
  const res = await search({
    q,
    limit: "100",
    filter: `buyingOptions:{FIXED_PRICE},${CONDITIONS},${US_ONLY}`,
  });
  return (res.itemSummaries ?? []).flatMap((item) => toListing(item, "fixed"));
}

/** Auctions for `q` that already have bids and end within two days. */
export async function searchAuctions(
  q: string,
  now = new Date(),
): Promise<ThriftListing[]> {
  const until = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");
  const res = await search({
    q,
    limit: "50",
    sort: "endingSoonest",
    filter: `buyingOptions:{AUCTION},bidCount:[1..],itemEndDate:[${iso(now)}..${iso(until)}],${CONDITIONS},${US_ONLY}`,
  });
  return (res.itemSummaries ?? []).flatMap((item) =>
    toListing(item, "auction"),
  );
}

const amount = (m: Money | undefined) => {
  const n = Number(m?.value);
  return m?.currency === "USD" && Number.isFinite(n) && n > 0 ? n : undefined;
};

/** One listing, or nothing when eBay left out what the estimate needs. */
export function toListing(
  item: EbayItemSummary,
  kind: ThriftListing["kind"],
): ThriftListing[] {
  const price =
    kind === "auction" ? amount(item.currentBidPrice) : amount(item.price);
  if (!item.itemId || !item.title || !item.itemWebUrl || price === undefined) {
    return [];
  }
  const shippingCost = item.shippingOptions?.[0]?.shippingCost;
  const shipping =
    shippingCost?.value === undefined ? undefined : Number(shippingCost.value);
  return [
    {
      id: item.itemId,
      title: item.title,
      price,
      kind,
      url: item.itemWebUrl,
      ...(Number.isFinite(shipping) && { shipping }),
      ...(kind === "auction" && {
        bids: item.bidCount ?? 0,
        endsAt: item.itemEndDate,
      }),
      ...(item.condition && { condition: item.condition }),
      ...((item.thumbnailImages?.[0]?.imageUrl ?? item.image?.imageUrl) && {
        imageUrl: item.thumbnailImages?.[0]?.imageUrl ?? item.image?.imageUrl,
      }),
      ...(item.itemCreationDate && { listedAt: item.itemCreationDate }),
    },
  ];
}
