// Temporary: reads Poshmark's sold search for real titles, prices and
// dates to judge whether it is usable. Removed afterwards.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const queries = [
  "levis 501",
  "patagonia better sweater",
  "carhartt detroit jacket",
];

function extractState(html) {
  const i = html.indexOf("window.__INITIAL_STATE__");
  if (i < 0) return null;
  const start = html.indexOf("{", i);
  let depth = 0,
    inStr = false,
    esc = false;
  for (let j = start; j < html.length; j++) {
    const c = html[j];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0)
      return JSON.parse(html.slice(start, j + 1));
  }
  return null;
}

function findListings(node, out = []) {
  if (Array.isArray(node)) node.forEach((n) => findListings(n, out));
  else if (node && typeof node === "object") {
    if (node.price_amount && node.title && node.inventory) out.push(node);
    else Object.values(node).forEach((n) => findListings(n, out));
  }
  return out;
}

for (const query of queries) {
  const url = `https://poshmark.com/search?query=${encodeURIComponent(query)}&availability=sold_out&type=listings`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
  });
  const html = await res.text();
  let listings = [];
  try {
    listings = findListings(extractState(html));
  } catch (e) {
    console.log("parse failed", e.message);
  }
  console.log(`### ${query}: HTTP ${res.status}, ${listings.length} listings`);
  if (listings[0]) console.log("  keys:", Object.keys(listings[0]).join(","));
  for (const l of listings.slice(0, 12)) {
    console.log(
      `  $${l.price_amount?.val} (orig $${l.original_price_amount?.val}) ${l.inventory?.status} | ${l.title} | size ${l.size} | ${l.brand} | updated ${l.updated_at ?? l.inventory?.status_changed_at ?? "?"} | ${l.condition ?? ""}`,
    );
  }
  const prices = listings
    .map((l) => Number(l.price_amount?.val))
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  if (prices.length)
    console.log(
      `  median $${prices[Math.floor(prices.length / 2)]}, range $${prices[0]}-$${prices.at(-1)}`,
    );
  await new Promise((r) => setTimeout(r, 3000));
}
