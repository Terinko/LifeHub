import type { ThriftListing } from "./types";

/** Fewer sales than this, and there's too little to go on. */
export const THRIFT_MIN_SALES = 5;
/** Dearest quarter ÷ cheapest quarter beyond this, and prices are all over. */
export const THRIFT_MAX_SPREAD = 3;

/** The q-th quantile (0..1) with linear interpolation. */
export function quantile(values: number[], q: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

export type ThriftEstimate = {
  /** Middle half of the kept sale prices, or nulls with too few sales. */
  low: number | null;
  typical: number | null;
  high: number | null;
  /** Kept sale prices. */
  prices: number[];
  /** Dearest quarter ÷ cheapest quarter. */
  spread: number | null;
};

/**
 * What it likely sells for, from real sales: the middle half of the sale
 * prices that weren't marked "Not a match". Never invents a number: with
 * fewer than THRIFT_MIN_SALES sales, low, typical and high are null.
 */
export function thriftEstimate(
  listings: ThriftListing[],
  excluded: ReadonlySet<string>,
): ThriftEstimate {
  const prices = listings
    .filter((l) => !excluded.has(l.id))
    .map((l) => l.price);
  if (prices.length < THRIFT_MIN_SALES) {
    return { low: null, typical: null, high: null, prices, spread: null };
  }
  const low = quantile(prices, 0.25)!;
  const high = quantile(prices, 0.75)!;
  return {
    low,
    typical: quantile(prices, 0.5),
    high,
    prices,
    spread: low > 0 ? high / low : null,
  };
}

export type ThriftVerdict = "good" | "fair" | "skip" | "unsure";

/**
 * Good find when the tag is at most a third of the low end of what it sells
 * for, Fair price at most two thirds, Skip above that. Not sure when there
 * are too few sales or prices vary too much to trust. Null until a tag price.
 */
export function thriftVerdict(
  tag: number | null,
  estimate: Pick<ThriftEstimate, "low" | "spread">,
): ThriftVerdict | null {
  if (estimate.low === null) return "unsure";
  if (estimate.spread !== null && estimate.spread > THRIFT_MAX_SPREAD) {
    return "unsure";
  }
  if (tag === null || !(tag > 0)) return null;
  if (tag <= estimate.low / 3) return "good";
  if (tag <= (estimate.low * 2) / 3) return "fair";
  return "skip";
}
