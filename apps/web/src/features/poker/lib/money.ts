/** Whole cents, so sums of payouts never drift. */
export const round2 = (n: number) => Math.round(n * 100) / 100;

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const wholeDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** "$20.00" */
export const formatMoney = (n: number) => dollars.format(Math.abs(n));

/** "$80", or "$7.50" when there are cents. */
export const formatShortMoney = (n: number) =>
  Number.isInteger(n) ? wholeDollars.format(n) : dollars.format(n);

/**
 * "+$20.00", "−$25.00" or "$0.00". Money always carries its sign, so up and
 * down never rely on color alone.
 */
export function formatSigned(n: number): string {
  const r = round2(n);
  if (r === 0) return dollars.format(0);
  return `${r > 0 ? "+" : "−"}${dollars.format(Math.abs(r))}`;
}

export type Trend = "up" | "down" | "even";

export const trendOf = (n: number): Trend => {
  const r = round2(n);
  return r > 0 ? "up" : r < 0 ? "down" : "even";
};

/** "80,000" */
export const formatChips = (n: number) => n.toLocaleString("en-US");

/** Reads a typed chip count: digits only, blank means not counted yet. */
export function parseChips(text: string): number | null {
  const digits = text.replace(/[^\d]/g, "");
  return digits === "" ? null : Number(digits);
}

/** "+$5", "−$7.50" or "$0": a compact signed amount for badges. */
export function formatShortSigned(n: number): string {
  const r = round2(n);
  if (r === 0) return formatShortMoney(0);
  return `${r > 0 ? "+" : "−"}${formatShortMoney(Math.abs(r))}`;
}

/** "+41%", "−30%" or "0%": a signed whole percent, like ROI. */
export const formatPct = (n: number) =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(Math.round(n))}%`;
