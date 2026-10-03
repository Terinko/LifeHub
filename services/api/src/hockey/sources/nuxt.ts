// Sidearm's new sites are Nuxt apps that ship their data in the page as a
// "devalue" array: every object and array value is an index into the same
// array. This turns that back into plain values.

const WRAPPERS = new Set([
  "Reactive",
  "ShallowReactive",
  "Ref",
  "ShallowRef",
  "EmptyRef",
  "EmptyShallowRef",
  "NuxtError",
]);

/** The page's `__NUXT_DATA__` array, or undefined if it has none. */
export function nuxtData(html: string): unknown[] | undefined {
  const m = html.match(
    /<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!m?.[1]) return undefined;
  const data: unknown = JSON.parse(m[1]);
  return Array.isArray(data) ? data : undefined;
}

/** The value stored at `index`, with every reference inside it followed. */
export function resolve(data: unknown[], index: number, depth = 0): unknown {
  if (depth > 40) return undefined;
  const value = data[index];
  if (value === null || typeof value !== "object") return value;
  const follow = (ref: unknown) =>
    typeof ref === "number" ? resolve(data, ref, depth + 1) : ref;
  if (Array.isArray(value)) {
    const [tag, inner] = value as unknown[];
    if (typeof tag === "string" && WRAPPERS.has(tag)) return follow(inner);
    return value.map(follow);
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, ref]) => [key, follow(ref)]),
  );
}

/** The first object in the payload that has `key`, fully resolved. */
export function findObjectWith(
  data: unknown[],
  key: string,
): Record<string, unknown> | undefined {
  const index = data.findIndex(
    (v) => v !== null && typeof v === "object" && !Array.isArray(v) && key in v,
  );
  if (index === -1) return undefined;
  return resolve(data, index) as Record<string, unknown>;
}
