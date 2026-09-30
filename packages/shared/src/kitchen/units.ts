// Unit spelling and conversion, shared so the app's hints ("2 in pantry")
// and the server's pantry math always agree.

const UNIT_ALIASES: Record<string, string> = {
  cup: "cup",
  cups: "cup",
  c: "cup",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  "fl oz": "fl_oz",
  fl_oz: "fl_oz",
  "fluid ounce": "fl_oz",
  "fluid ounces": "fl_oz",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  l: "l",
  liter: "l",
  liters: "l",
  litre: "l",
  litres: "l",
  gal: "gal",
  gallon: "gal",
  gallons: "gal",
  qt: "qt",
  quart: "qt",
  quarts: "qt",
  pt: "pt",
  pint: "pt",
  pints: "pt",
  pinch: "pinch",
  pinches: "pinch",
  "": "item",
  item: "item",
  items: "item",
  piece: "item",
  pieces: "item",
  pc: "item",
  pcs: "item",
  x: "item",
};

const VOLUME_TO_ML: Record<string, number> = {
  cup: 236.588,
  tbsp: 14.7868,
  tsp: 4.92892,
  fl_oz: 29.5735,
  ml: 1,
  l: 1000,
  gal: 3785.41,
  qt: 946.353,
  pt: 473.176,
};
const WEIGHT_TO_G: Record<string, number> = {
  oz: 28.3495,
  lb: 453.592,
  g: 1,
  kg: 1000,
};

/** "Tablespoons" → "tbsp"; unknown units ("bag", "slice") keep their lower-cased spelling. */
export function normalizeUnit(unit: string | undefined | null): string {
  const key = (unit ?? "").trim().toLowerCase().replace(/\.$/, "");
  return UNIT_ALIASES[key] ?? singular(key);
}

/** Every spelling normalizeUnit understands, for reading "2 lb beef". */
export const KNOWN_UNITS = Object.keys(UNIT_ALIASES).filter(Boolean);

/**
 * Converts between units of the same kind (volume or weight), or between two
 * spellings of the same unit. Returns null when they don't convert, like
 * slices and loaves.
 */
export function convertUnit(
  quantity: number,
  fromUnit: string | undefined,
  toUnit: string | undefined,
): number | null {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  if (from === to) return quantity;
  const [vf, vt] = [VOLUME_TO_ML[from], VOLUME_TO_ML[to]];
  if (vf && vt) return (quantity * vf) / vt;
  const [wf, wt] = [WEIGHT_TO_G[from], WEIGHT_TO_G[to]];
  if (wf && wt) return (quantity * wf) / wt;
  return null;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** "tomatoes" → "tomato", "berries" → "berry", "eggs" → "egg"; "hummus" stays. */
export function singular(word: string): string {
  if (word.length <= 3) return word;
  if (/ies$/.test(word)) return word.slice(0, -3) + "y";
  if (/(oes|ches|shes|sses|xes|zes)$/.test(word)) return word.slice(0, -2);
  if (/(ss|us|is)$/.test(word)) return word;
  return word.replace(/s$/, "");
}
