// Temporary: checks whether Poshmark's sold search gives usable sold
// listings (title, price, sold status) to a server. Removed afterwards.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const queries = [
  "levis 501",
  "patagonia better sweater",
  "north face nuptse",
  "lululemon define jacket",
  "carhartt detroit jacket",
];
const count = (s, re) => (s.match(re) || []).length;
for (const query of queries) {
  const url = `https://poshmark.com/search?query=${encodeURIComponent(query)}&availability=sold_out&type=listings`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
  });
  const body = await res.text();
  console.log(`### ${query}: HTTP ${res.status} ${body.length} bytes`);
  for (const k of [
    "sold_out",
    "price_amount",
    "original_price_amount",
    "inventory",
    "__INITIAL_STATE__",
    "tile__covershot",
    "sold-tag",
    "SOLD",
  ])
    console.log(`  ${k}: ${count(body, new RegExp(k, "g"))}`);
  if (query === queries[0]) {
    const i = body.indexOf("price_amount");
    if (i > 0)
      console.log(
        "JSON SAMPLE:",
        body.slice(Math.max(0, i - 1500), i + 700).replace(/\s+/g, " "),
      );
    const j = body.indexOf("tile__covershot");
    if (j > 0)
      console.log("HTML SAMPLE:", body.slice(j, j + 2500).replace(/\s+/g, " "));
  }
  await new Promise((r) => setTimeout(r, 3000));
}
