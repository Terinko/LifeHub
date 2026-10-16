import type { ThriftCalibration, ThriftListing } from "./types";

/** Fewer Buy It Now listings than this, and asking prices say too little. */
export const THRIFT_MIN_LISTINGS = 8;
/** Calibration checks needed before a ratio is used. */
export const THRIFT_MIN_CHECKS = 5;
/** Cheapest quarter vs. dearest quarter beyond this, and prices are all over. */
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

export type ThriftEstimateKind =
  /** Auctions with bids set the floor, the cheapest quarter the ceiling. */
  | "range"
  /** Cheapest quarter times the calibrated ratio, up to the cheapest quarter. */
  | "calibrated"
  /** Only the cheapest-quarter asking price, before any calibration. */
  | "asking"
  /** Only auctions with bids: at least the current bid. */
  | "floor"
  | "none";

export type ThriftEstimate = {
  kind: ThriftEstimateKind;
  low: number | null;
  high: number | null;
  /** Cheapest-quarter Buy It Now price, when there are enough listings. */
  ceiling: number | null;
  fixed: number[];
  bids: number[];
  /** Dearest quarter ÷ cheapest quarter of Buy It Now prices. */
  spread: number | null;
};

/**
 * The likely sale price from current listings: auctions with bids are a
 * floor (real buyers, still rising), the cheapest quarter of Buy It Now
 * listings a ceiling (a buyer can always pay that), and the calibrated
 * ratio fills in when there are no auctions. Never invents a number: with
 * too little data the kind is "none".
 */
export function thriftEstimate(
  listings: ThriftListing[],
  excluded: ReadonlySet<string>,
  calibration: ThriftCalibration | null,
): ThriftEstimate {
  const kept = listings.filter((l) => !excluded.has(l.id));
  const fixed = kept.filter((l) => l.kind === "fixed").map((l) => l.price);
  const bids = kept
    .filter((l) => l.kind === "auction" && (l.bids ?? 0) > 0)
    .map((l) => l.price);

  const enough = fixed.length >= THRIFT_MIN_LISTINGS;
  const ceiling = enough ? quantile(fixed, 0.25) : null;
  const spread = enough && ceiling ? quantile(fixed, 0.75)! / ceiling : null;
  const bidMid = quantile(bids, 0.5);
  const base = { ceiling, fixed, bids, spread };

  if (ceiling !== null && bidMid !== null) {
    return {
      ...base,
      kind: "range",
      low: Math.min(bidMid, ceiling),
      high: Math.max(bidMid, ceiling),
    };
  }
  if (
    ceiling !== null &&
    calibration &&
    calibration.checks >= THRIFT_MIN_CHECKS
  ) {
    const low = ceiling * calibration.ratio;
    return {
      ...base,
      kind: "calibrated",
      low: Math.min(low, ceiling),
      high: Math.max(low, ceiling),
    };
  }
  if (ceiling !== null) {
    return { ...base, kind: "asking", low: ceiling, high: ceiling };
  }
  if (bidMid !== null)
    return { ...base, kind: "floor", low: bidMid, high: null };
  return { ...base, kind: "none", low: null, high: null };
}

export type ThriftVerdict = "good" | "fair" | "skip" | "unsure";

/**
 * Good find when the tag is at most a third of the low end of the estimate,
 * Fair price at most two thirds, Skip above that. Not sure when there's no
 * estimate or prices vary too much to trust one. Null until a tag price.
 */
export function thriftVerdict(
  tag: number | null,
  estimate: ThriftEstimate,
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
