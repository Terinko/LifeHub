// Temporary: checks which resale sites answer a server with listings and
// prices for a search. Removed once the answer is in.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const q = encodeURIComponent("levis 501");
const sites = {
  "Poshmark sold": `https://poshmark.com/search?query=${q}&availability=sold_out`,
  "Mercari sold": `https://www.mercari.com/search/?keyword=${q}&itemStatuses=2`,
  "Depop page": `https://www.depop.com/search/?q=${q}`,
  "Depop api": `https://webapi.depop.com/api/v2/search/products/?what=${q}&country=us&currency=USD&itemsPerPage=24`,
  "Grailed sold": `https://www.grailed.com/sold?query=${q}`,
  ThredUp: `https://www.thredup.com/products?search_text=${q}`,
  Vinted: `https://www.vinted.com/catalog?search_text=${q}`,
};
const count = (s, re) => (s.match(re) || []).length;
for (const [name, url] of Object.entries(sites)) {
  try {
    const t = Date.now();
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
    });
    const body = await res.text();
    console.log(
      `### ${name}: HTTP ${res.status} ${body.length} bytes ${Date.now() - t}ms`,
    );
    console.log("  title:", (body.match(/<title[^>]*>([^<]*)/) || [])[1]);
    console.log("  $prices:", count(body, /\$\d{1,4}(\.\d\d)?/g));
    console.log('  "price" keys:', count(body, /"price/gi));
    console.log("  next data:", body.includes("__NEXT_DATA__"));
    console.log("  sold words:", count(body, /sold/gi));
    console.log(
      "  blocked:",
      count(
        body,
        /captcha|Access Denied|Just a moment|blocked|perimeterx|px-captcha/gi,
      ),
    );
    const i = body.search(/\$\d{1,4}/);
    if (i > 0)
      console.log(
        "  sample:",
        body.slice(Math.max(0, i - 300), i + 200).replace(/\s+/g, " "),
      );
  } catch (e) {
    console.log(`### ${name}: failed ${e}`);
  }
  await new Promise((r) => setTimeout(r, 2000));
}
