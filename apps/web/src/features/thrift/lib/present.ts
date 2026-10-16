import {
  THRIFT_MIN_SALES,
  thriftVerdict,
  type ThriftEstimate,
  type ThriftVerdict,
} from "@lifehub/shared";

export const money = (n: number) => `$${Math.round(n)}`;

export const VERDICT_WORDS: Record<ThriftVerdict, string> = {
  good: "Good find",
  fair: "Fair price",
  skip: "Skip",
  unsure: "Not sure",
};

/** "Likely sells for" in one short phrase. */
export function estimateText(est: ThriftEstimate): string {
  if (est.low === null || est.high === null) return "No estimate";
  if (Math.round(est.low) === Math.round(est.high)) return money(est.low);
  return `${money(est.low)}–${money(est.high)}`;
}

/** How the tag compares with a price, in words. */
function share(tag: number, price: number): string {
  const r = tag / price;
  return r <= 0.34
    ? "about a third of"
    : r <= 0.55
      ? "about half of"
      : r <= 0.7
        ? "about two thirds of"
        : r <= 1
          ? "close to"
          : "above";
}

const sales = (n: number) => `${n} matching sale${n === 1 ? "" : "s"}`;

/** The line under the verdict word. */
export function verdictLine(
  verdict: ThriftVerdict | null,
  tag: number | null,
  est: ThriftEstimate,
): string {
  if (est.low === null) {
    return `Only ${sales(est.prices.length)} on Poshmark. That's too few to judge.`;
  }
  if (verdict === "unsure") {
    return "Sale prices for this vary too much to judge.";
  }
  if (tag === null) return "Type the tag price to get a verdict.";
  return `Tag ${money(tag)} is ${share(tag, est.low)} the low end of what it sells for.`;
}

/** One sentence on where the estimate came from, with its numbers. */
export function howText(est: ThriftEstimate): string {
  if (est.typical === null) return "";
  return `The middle half of ${est.prices.length} recent Poshmark sales, with a typical sale at ${money(est.typical)}. Each price is what the item was listed at when it sold, so an accepted offer can make the real figure a little lower.`;
}

export type Confidence = { level: "High" | "Medium" | "Low"; why: string };

/** Many sales close together, and a brand read off the tag, earn trust. */
export function confidence(
  est: ThriftEstimate,
  brandFromTag: boolean,
): Confidence {
  const why = [brandFromTag ? "brand read from the tag" : "brand typed in"];
  const n = est.prices.length;
  why.push(sales(n));
  if (est.low === null) return { level: "Low", why: why.join(", ") };
  const tight = est.spread !== null && est.spread <= 2;
  why.push(tight ? "prices close together" : "prices spread out");
  const strong = n >= 15 && tight;
  return {
    level:
      strong && brandFromTag
        ? "High"
        : strong || (brandFromTag && n >= THRIFT_MIN_SALES)
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
  const verdict = thriftVerdict(tag, { low: sold, spread: null });
  if (tag === null) {
    return { verdict, line: "Type the tag price to get a verdict." };
  }
  return {
    verdict,
    line: `Tag ${money(tag)} is ${share(tag, sold)} the ${money(sold)} you saw it sell for.`,
  };
}
