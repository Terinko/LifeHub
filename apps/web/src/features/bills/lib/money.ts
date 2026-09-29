/** Whole cents, so sums never drift. */
export const round2 = (n: number) => Math.round(n * 100) / 100;

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const whole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** "$1,450.00" */
export const formatMoney = (n: number) => dollars.format(round2(n));

/** "$340", or "$11.99" when there are cents. */
export const formatShort = (n: number) =>
  Number.isInteger(round2(n)) ? whole.format(n) : dollars.format(round2(n));

/** Reads a typed amount like "$1,450.5"; blank or junk is null. */
export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? round2(n) : null;
}
