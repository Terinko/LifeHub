/**
 * Brands people commonly find on a thrift rack, matched against the text the
 * phone reads off a tag. `also` lists other ways the name shows up on labels.
 */
export const BRANDS: { name: string; also?: string[] }[] = [
  { name: "Abercrombie & Fitch", also: ["Abercrombie"] },
  { name: "Adidas" },
  { name: "Aerie" },
  { name: "Aeropostale" },
  { name: "Allen Edmonds" },
  { name: "AllSaints", also: ["All Saints"] },
  { name: "Alo Yoga", also: ["Alo"] },
  { name: "American Eagle", also: ["American Eagle Outfitters", "AEO"] },
  { name: "Ann Taylor" },
  { name: "Anthropologie" },
  { name: "Arc'teryx", also: ["Arcteryx"] },
  { name: "Athleta" },
  { name: "Banana Republic" },
  { name: "Barbour" },
  { name: "Bass", also: ["G.H. Bass", "GH Bass"] },
  { name: "Ben Sherman" },
  { name: "Birkenstock" },
  { name: "Bonobos" },
  { name: "Boden" },
  { name: "Brooks Brothers" },
  { name: "Burberry" },
  { name: "Calvin Klein" },
  { name: "Canada Goose" },
  { name: "Carhartt" },
  { name: "Champion" },
  { name: "Chaps" },
  { name: "Chico's", also: ["Chicos"] },
  { name: "Clarks" },
  { name: "Club Monaco" },
  { name: "Coach" },
  { name: "Cole Haan" },
  { name: "Columbia", also: ["Columbia Sportswear"] },
  { name: "Converse" },
  { name: "Cos" },
  { name: "Crocs" },
  { name: "Dansko" },
  { name: "Dickies" },
  { name: "Diesel" },
  { name: "DKNY", also: ["Donna Karan"] },
  { name: "Doc Martens", also: ["Dr. Martens", "Dr Martens", "AirWair"] },
  { name: "Dooney & Bourke", also: ["Dooney"] },
  { name: "Duluth Trading", also: ["Duluth"] },
  { name: "Eddie Bauer" },
  { name: "Eileen Fisher" },
  { name: "Ellesse" },
  { name: "Equipment" },
  { name: "Everlane" },
  { name: "Express" },
  { name: "Filson" },
  { name: "Fila" },
  { name: "Fossil" },
  { name: "Free People" },
  { name: "Frye" },
  { name: "Gant" },
  { name: "Gap" },
  { name: "Gucci" },
  { name: "Guess" },
  { name: "Gymshark" },
  { name: "H&M", also: ["H & M"] },
  { name: "Hanes" },
  { name: "Harley-Davidson", also: ["Harley Davidson"] },
  { name: "Helly Hansen" },
  { name: "Hoka", also: ["Hoka One One"] },
  { name: "Hollister" },
  { name: "Hugo Boss", also: ["Boss"] },
  { name: "Hunter" },
  { name: "J.Crew", also: ["J Crew", "JCrew"] },
  { name: "J.Jill", also: ["J Jill"] },
  { name: "Jansport" },
  { name: "Joe's Jeans", also: ["Joes Jeans"] },
  { name: "Johnston & Murphy" },
  { name: "Kate Spade" },
  { name: "Keen" },
  { name: "Kenneth Cole" },
  { name: "Kut from the Kloth" },
  { name: "L.L.Bean", also: ["LL Bean", "LLBean", "L L Bean"] },
  { name: "Lacoste" },
  { name: "Lands' End", also: ["Lands End"] },
  { name: "Lee" },
  { name: "Levi's", also: ["Levis", "Levi Strauss"] },
  { name: "Loft", also: ["Ann Taylor Loft"] },
  { name: "Longchamp" },
  { name: "Lucky Brand" },
  { name: "Lululemon", also: ["Lululemon Athletica"] },
  { name: "Madewell" },
  { name: "Mango" },
  { name: "Marmot" },
  { name: "Max Mara" },
  { name: "Merrell" },
  { name: "Michael Kors", also: ["MK"] },
  { name: "Miu Miu" },
  { name: "Mountain Hardwear" },
  { name: "Nautica" },
  { name: "New Balance" },
  { name: "Nike" },
  { name: "Nine West" },
  { name: "Nudie Jeans", also: ["Nudie"] },
  { name: "Old Navy" },
  { name: "Orvis" },
  { name: "Outdoor Research" },
  { name: "Pendleton" },
  { name: "Patagonia" },
  { name: "Polo Ralph Lauren", also: ["Polo", "Ralph Lauren", "Lauren"] },
  { name: "Prada" },
  { name: "Puma" },
  { name: "Quiksilver" },
  { name: "Rag & Bone", also: ["Rag and Bone"] },
  { name: "Ray-Ban", also: ["Ray Ban"] },
  { name: "Red Wing", also: ["Red Wing Shoes"] },
  { name: "Reebok" },
  { name: "Reformation" },
  { name: "REI", also: ["REI Co-op"] },
  { name: "Rockport" },
  { name: "Ross" },
  { name: "Saucony" },
  { name: "Sam Edelman" },
  { name: "Scotch & Soda" },
  { name: "Sorel" },
  { name: "Sperry", also: ["Sperry Top-Sider"] },
  { name: "St. John", also: ["St John"] },
  { name: "Stan Smith" },
  { name: "Steve Madden" },
  { name: "Stone Island" },
  { name: "Stussy" },
  { name: "Superdry" },
  { name: "Supreme" },
  { name: "Talbots" },
  { name: "Ted Baker" },
  { name: "Theory" },
  { name: "The North Face", also: ["North Face", "TNF"] },
  { name: "Timberland" },
  { name: "Tommy Bahama" },
  { name: "Tommy Hilfiger", also: ["Hilfiger"] },
  { name: "Tory Burch" },
  { name: "True Religion" },
  { name: "Uggs", also: ["UGG", "UGG Australia"] },
  { name: "Under Armour" },
  { name: "Uniqlo" },
  { name: "Urban Outfitters" },
  { name: "Vans" },
  { name: "Vera Bradley" },
  { name: "Vince" },
  { name: "Vineyard Vines" },
  { name: "Wolverine" },
  { name: "Woolrich" },
  { name: "Wrangler" },
  { name: "Zara" },
];

/** Upper case, letters and digits only, single spaces. */
export function normalizeLabel(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/['’]/g, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

/** Single-character edits apart, for one-letter misreads like "PATAGOMIA". */
function oneEditApart(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/**
 * Brands whose name appears in the tag text, best first: a whole-word match,
 * then the name run together ("LEVISTRAUSS"), then a one-letter misread of a
 * longer single-word name. At most `limit`.
 */
export function matchBrands(text: string, limit = 3): string[] {
  const hay = ` ${normalizeLabel(text)} `;
  if (!hay.trim()) return [];
  const words = hay.trim().split(" ");
  const joined = hay.replace(/ /g, "");

  const scored = BRANDS.flatMap(({ name, also = [] }) => {
    let best = 0;
    for (const form of [name, ...also]) {
      const n = normalizeLabel(form);
      if (!n) continue;
      const tight = n.replace(/ /g, "");
      let score = 0;
      if (hay.includes(` ${n} `)) score = 300 + n.length;
      else if (tight.length >= 5 && joined.includes(tight)) {
        score = 200 + tight.length;
      } else if (
        !n.includes(" ") &&
        n.length >= 6 &&
        words.some((w) => oneEditApart(w, n))
      ) {
        score = 100 + n.length;
      }
      best = Math.max(best, score);
    }
    return best > 0 ? [{ name, score: best }] : [];
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.name);
}
