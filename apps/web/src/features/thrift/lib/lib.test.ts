import { describe, expect, it } from "vitest";
import {
  thriftEstimate,
  thriftQuery,
  thriftVerdict,
  type ThriftListing,
} from "@lifehub/shared";
import { matchBrands } from "./brands";
import { terapeakUrl } from "./links";
import { confidence, estimateText, howText, verdictLine } from "./present";

const fixed = (prices: number[]): ThriftListing[] =>
  prices.map((price, i) => ({
    id: `f${i}`,
    title: "Item",
    price,
    kind: "fixed",
    url: "https://www.ebay.com/itm/1",
  }));
const auction = (id: string, price: number, bids = 3): ThriftListing => ({
  id,
  title: "Item",
  price,
  kind: "auction",
  bids,
  url: "https://www.ebay.com/itm/2",
});

const NONE = new Set<string>();
const TEN = [40, 42, 44, 46, 48, 50, 55, 60, 65, 70];

describe("matchBrands", () => {
  it("finds a brand on its own line of tag text", () => {
    expect(matchBrands("PATAGONIA\nRN 51884\nMADE IN USA")[0]).toBe(
      "Patagonia",
    );
  });

  it("knows labels that spell the brand another way", () => {
    expect(matchBrands("LEVI STRAUSS & CO.\n501\nW32 L30")[0]).toBe("Levi's");
    expect(matchBrands("the north face")[0]).toBe("The North Face");
    expect(matchBrands("L.L.Bean Freeport Maine")[0]).toBe("L.L.Bean");
  });

  it("forgives a one-letter misread of a long name", () => {
    expect(matchBrands("PATAGOMIA")[0]).toBe("Patagonia");
  });

  it("prefers the fuller name when two match", () => {
    expect(matchBrands("POLO RALPH LAUREN")[0]).toBe("Polo Ralph Lauren");
  });

  it("finds nothing in unrelated text", () => {
    expect(matchBrands("100% COTTON MACHINE WASH COLD")).toEqual([]);
    expect(matchBrands("")).toEqual([]);
  });
});

describe("thriftEstimate", () => {
  it("is a range from the auction floor to the cheapest quarter", () => {
    const est = thriftEstimate(
      [...fixed(TEN), auction("a", 31), auction("b", 36)],
      NONE,
      null,
    );
    expect(est.kind).toBe("range");
    expect(est.low).toBe(33.5);
    expect(est.high).toBeCloseTo(44.5);
    expect(estimateText(est)).toBe("$34–$45");
  });

  it("uses the calibrated ratio once there are enough checks", () => {
    const est = thriftEstimate(fixed(TEN), NONE, { ratio: 0.7, checks: 6 });
    expect(est.kind).toBe("calibrated");
    expect(est.low).toBeCloseTo(44.5 * 0.7);
    expect(est.high).toBeCloseTo(44.5);
  });

  it("falls back to the asking price before calibration, and says so", () => {
    const est = thriftEstimate(fixed(TEN), NONE, { ratio: 0.7, checks: 2 });
    expect(est.kind).toBe("asking");
    expect(howText(est, { ratio: 0.7, checks: 2 }, "Jeans or pants")).toContain(
      "(2 of 5)",
    );
  });

  it("gives no estimate with too few listings and no auctions", () => {
    const est = thriftEstimate(fixed([25, 32, 48]), NONE, null);
    expect(est.kind).toBe("none");
    expect(thriftVerdict(5, est)).toBe("unsure");
    expect(verdictLine("unsure", 5, est)).toMatch(/^Only 3 current listings/);
    expect(confidence(est, true).level).toBe("Low");
  });

  it("leaves excluded listings out", () => {
    const listings = fixed(TEN);
    const est = thriftEstimate(listings, new Set(["f0", "f1", "f2"]), null);
    expect(est.kind).toBe("none");
    expect(est.fixed).toHaveLength(7);
  });

  it("ignores auctions nobody has bid on", () => {
    const est = thriftEstimate([auction("a", 5, 0)], NONE, null);
    expect(est.kind).toBe("none");
  });
});

describe("thriftVerdict", () => {
  const est = thriftEstimate([...fixed(TEN), auction("a", 30)], NONE, null);

  it("waits for a tag price", () => {
    expect(thriftVerdict(null, est)).toBeNull();
  });

  it("calls a third of the low end a good find", () => {
    expect(thriftVerdict(10, est)).toBe("good");
    expect(thriftVerdict(15, est)).toBe("fair");
    expect(thriftVerdict(25, est)).toBe("skip");
  });

  it("is not sure when asking prices are spread too wide", () => {
    const wide = thriftEstimate(
      fixed([10, 10, 10, 12, 50, 60, 80, 90, 100, 120]),
      NONE,
      null,
    );
    expect(thriftVerdict(2, wide)).toBe("unsure");
  });
});

describe("links and search", () => {
  it("builds the eBay search from the brand and detail", () => {
    expect(
      thriftQuery({
        brand: "Levi's",
        itemType: "Jeans or pants",
        detail: " 501 ",
      }),
    ).toBe("levi's 501");
    expect(thriftQuery({ brand: "Coach", itemType: "Bag" })).toBe("coach bag");
  });

  it("opens Terapeak's sold tab for the same search", () => {
    const url = new URL(terapeakUrl("coach bag"));
    expect(url.pathname).toBe("/sh/research");
    expect(url.searchParams.get("keywords")).toBe("coach bag");
    expect(url.searchParams.get("tabName")).toBe("SOLD");
  });
});
