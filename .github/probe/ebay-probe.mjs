// Temporary: checks whether eBay's Sold search page answers a datacenter
// server, and what its markup looks like. Removed once the answer is in.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const queries = [
  "patagonia better sweater",
  "levis 501 jeans",
  "north face nuptse jacket",
  "lululemon define jacket",
  "carhartt detroit jacket",
];
const count = (s, re) => (s.match(re) || []).length;
for (const q of queries) {
  const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}&LH_Sold=1&LH_Complete=1&_ipg=60`;
  const t = Date.now();
  let res, html;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html",
      },
    });
    html = await res.text();
  } catch (e) {
    console.log(`### ${q}: fetch failed ${e}`);
    continue;
  }
  console.log(
    `### ${q}: HTTP ${res.status} ${html.length} bytes ${Date.now() - t}ms final=${res.url}`,
  );
  console.log("title:", (html.match(/<title>([^<]*)/) || [])[1]);
  console.log(
    "blocked words:",
    count(html, /Pardon Our Interruption|captcha|Access Denied|splashui/gi),
  );
  for (const k of [
    "s-item__price",
    "s-card__price",
    "s-item__title",
    "s-card__title",
    "s-item__caption",
    "s-card__caption",
    "POSITIVE",
    "Sold  ",
    "Sold ",
  ])
    console.log(`  ${k}: ${count(html, new RegExp(k, "g"))}`);
  const i = html.search(/s-(item|card)__price/);
  if (i > 0 && q === queries[0])
    console.log(
      "SNIPPET:",
      html.slice(Math.max(0, i - 2500), i + 800).replace(/\s+/g, " "),
    );
  await new Promise((r) => setTimeout(r, 3000));
}
