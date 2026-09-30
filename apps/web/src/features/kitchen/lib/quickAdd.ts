import { KNOWN_UNITS } from "@lifehub/shared";

// Container words people shop by. They don't convert, but they read as units.
const CONTAINERS = [
  "bag",
  "bags",
  "box",
  "boxes",
  "can",
  "cans",
  "bottle",
  "bottles",
  "jar",
  "jars",
  "pack",
  "packs",
  "package",
  "packages",
  "dozen",
  "bunch",
  "bunches",
  "loaf",
  "loaves",
  "stick",
  "sticks",
  "carton",
  "cartons",
  "slice",
  "slices",
  "head",
  "heads",
  "clove",
  "cloves",
  "block",
  "blocks",
  "tub",
  "tubs",
];
const UNITS = new Set([...KNOWN_UNITS, ...CONTAINERS]);

const VULGAR: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
};

/** "1", "1.5", "1/2", "½", "1½" → a number, or null. */
function readNumber(word: string): number | null {
  const mixed = /^(\d+)?([¼½¾⅓⅔])$/.exec(word);
  if (mixed) return Number(mixed[1] ?? 0) + (VULGAR[mixed[2] ?? ""] ?? 0);
  const frac = /^(\d+)\/(\d+)$/.exec(word);
  if (frac) return Number(frac[2]) ? Number(frac[1]) / Number(frac[2]) : null;
  return /^\d*\.?\d+$/.test(word) ? Number(word) : null;
}

export type QuickAdd = { name: string; quantity: number; unit: string };

/**
 * Reads what someone typed into the add bar: "2 lb ground beef",
 * "1/2 cup rice", "milk", "eggs x12".
 */
export function parseQuickAdd(text: string): QuickAdd | null {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return null;

  let quantity = 1;
  let unit = "";
  const lead = readNumber(words[0] ?? "");
  if (lead !== null && words.length > 1) {
    quantity = lead;
    words.shift();
    const two = `${words[0]} ${words[1]}`.toLowerCase();
    if (words.length > 2 && UNITS.has(two)) {
      unit = `${words.shift()} ${words.shift()}`;
    } else if (words.length > 1 && UNITS.has((words[0] ?? "").toLowerCase())) {
      unit = words.shift() ?? "";
    }
  } else {
    const tail = /^x?(\d*\.?\d+)$/i.exec(words[words.length - 1] ?? "");
    if (tail && words.length > 1) {
      quantity = Number(tail[1]);
      words.pop();
    }
  }
  const name = words.join(" ");
  return name ? { name, quantity, unit } : null;
}
