const FRACTIONS: [number, string][] = [
  [0.25, "¼"],
  [0.333, "⅓"],
  [0.5, "½"],
  [0.667, "⅔"],
  [0.75, "¾"],
];

/** 1.5 → "1½", 0.25 → "¼", 2.4 → "2.4". */
export function formatNumber(n: number): string {
  const whole = Math.floor(n);
  const part = n - whole;
  if (part < 0.01) return String(whole);
  const frac = FRACTIONS.find(([v]) => Math.abs(part - v) < 0.01)?.[1];
  if (frac) return whole ? `${whole}${frac}` : frac;
  return String(Math.round(n * 100) / 100);
}

const COUNT_UNITS = new Set(["", "item", "items", "x"]);

/** "2 lb", "6", "½ bag". Count-only units show just the number. */
export function formatAmount(quantity: number, unit: string): string {
  const u = unit.trim();
  const n = formatNumber(quantity);
  return COUNT_UNITS.has(u.toLowerCase()) ? n : `${n} ${u}`;
}

type WithExtra = { unit: string; extra?: { quantity: number; unit: string }[] };

/** The main amount plus extras: "1 gal + 1 carton". */
export function formatAll(quantity: number, item: WithExtra): string {
  return [
    formatAmount(quantity, item.unit),
    ...(item.extra ?? []).map((e) => formatAmount(e.quantity, e.unit)),
  ].join(" + ");
}
