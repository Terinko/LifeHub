import {
  THRIFT_MIN_CHECKS,
  thriftVerdict,
  type ThriftCalibration,
  type ThriftEstimate,
  type ThriftItemType,
  type ThriftVerdict,
} from "@lifehub/shared";

export const money = (n: number) => `$${Math.round(n)}`;

export const VERDICT_WORDS: Record<ThriftVerdict, string> = {
  good: "Good find",
  fair: "Fair price",
  skip: "Skip",
  unsure: "Not sure",
};

/** The item kind as it reads mid-sentence: "fleeces and sweaters". */
const PLURALS: Record<ThriftItemType, string> = {
  "Coat or jacket": "coats and jackets",
  "Sweater or fleece": "sweaters and fleeces",
  "Shirt or top": "shirts and tops",
  "Jeans or pants": "jeans and pants",
  "Dress or skirt": "dresses and skirts",
  Shoes: "shoes",
  Bag: "bags",
  Other: "items like this",
};

/** "Likely sells for" in one short phrase. */
export function estimateText(est: ThriftEstimate): string {
  if (est.low === null) return "No estimate";
  if (est.high === null) return `At least ${money(est.low)}`;
  if (Math.round(est.low) === Math.round(est.high)) return money(est.low);
  return `${money(est.low)}–${money(est.high)}`;
}

/** The line under the verdict word. */
export function verdictLine(
  verdict: ThriftVerdict | null,
  tag: number | null,
  est: ThriftEstimate,
): string {
  if (est.kind === "none") {
    const n = est.fixed.length;
    return `Only ${n} current listing${n === 1 ? "" : "s"} match${n === 1 ? "es" : ""} and there are no live auctions with bids. That's too few to estimate.`;
  }
  if (verdict === "unsure") {
    return "Prices for this vary too much to judge from current listings.";
  }
  if (tag === null || est.low === null) {
    return "Type the tag price to get a verdict.";
  }
  const r = tag / est.low;
  const share =
    r <= 0.34
      ? "about a third of"
      : r <= 0.55
        ? "about half of"
        : r <= 0.7
          ? "about two thirds of"
          : r <= 1
            ? "close to"
            : "above";
  return `Tag ${money(tag)} is ${share} the low end of what it likely sells for.`;
}

/** One sentence on how the estimate was made, with its numbers. */
export function howText(
  est: ThriftEstimate,
  calibration: ThriftCalibration | null,
  itemType: ThriftItemType,
): string {
  const parts: string[] = [];
  if (est.bids.length) {
    const lo = Math.min(...est.bids);
    const hi = Math.max(...est.bids);
    parts.push(
      `${est.bids.length} auction${est.bids.length > 1 ? "s" : ""} with bids at ${money(lo)}${hi !== lo ? ` to ${money(hi)}` : ""}`,
    );
  }
  if (est.ceiling !== null) {
    parts.push(
      `the cheapest quarter of ${est.fixed.length} Buy It Now listings asks ${money(est.ceiling)}`,
    );
  }
  if (!parts.length) return "";
  let text = parts.join(", and ");
  text = `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
  if (est.kind === "calibrated" && calibration) {
    text += ` In the group's checks, ${PLURALS[itemType]} sold for about ${Math.round(calibration.ratio * 100)}% of that (${calibration.checks} checks).`;
  }
  if (est.kind === "asking") {
    const have = calibration?.checks ?? 0;
    text += ` There aren't enough sold-price checks for ${PLURALS[itemType]} yet (${have} of ${THRIFT_MIN_CHECKS}), so this is the asking price, which usually runs high.`;
  }
  return text;
}

export type Confidence = { level: "High" | "Medium" | "Low"; why: string };

export function confidence(
  est: ThriftEstimate,
  brandFromTag: boolean,
): Confidence {
  const brand = brandFromTag ? "brand read from the tag" : "brand typed in";
  if (est.kind === "none") {
    return {
      level: "Low",
      why: `${brand}, but only ${est.fixed.length} matches`,
    };
  }
  const why = [brand];
  if (est.fixed.length) why.push(`${est.fixed.length} close matches`);
  if (est.bids.length) {
    why.push(
      `${est.bids.length} live auction${est.bids.length > 1 ? "s" : ""}`,
    );
  }
  const strong = est.kind === "range" || est.kind === "calibrated";
  if (est.kind === "asking") why.push("not calibrated yet");
  return {
    level:
      strong && brandFromTag
        ? "High"
        : strong || brandFromTag
          ? "Medium"
          : "Low",
    why: why.join(", "),
  };
}

/** The verdict against a sold price the person looked up themselves. */
export function soldVerdict(
  tag: number | null,
  sold: number | null,
): { verdict: ThriftVerdict | null; line: string } {
  if (sold === null) {
    return { verdict: null, line: "Type what it sold for to get a verdict." };
  }
  const verdict = thriftVerdict(tag, {
    kind: "range",
    low: sold,
    high: sold,
    ceiling: null,
    fixed: [],
    bids: [],
    spread: null,
  });
  if (tag === null) {
    return { verdict, line: "Type the tag price to get a verdict." };
  }
  const r = tag / sold;
  const share =
    r <= 0.34
      ? "about a third of"
      : r <= 0.55
        ? "about half of"
        : r <= 0.7
          ? "about two thirds of"
          : r <= 1
            ? "close to"
            : "above";
  return {
    verdict,
    line: `Tag ${money(tag)} is ${share} the ${money(sold)} you saw it sell for.`,
  };
}
