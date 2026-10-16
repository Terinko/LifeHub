import { describe, expect, it } from "vitest";
import {
  thriftEstimate,
  thriftQuery,
  thriftVerdict,
  type ThriftListing,
} from "@lifehub/shared";
import { matchBrands } from "./brands";
import { poshmarkSoldUrl } from "./links";
import {
  confidence,
  estimateText,
  howText,
  soldVerdict,
  verdictLine,
} from "./present";

const sold = (prices: number[]): ThriftListing[] =>
  prices.map((price, i) => ({
    id: `s${i}`,
    title: "Item",
    price,
    url: `https://poshmark.com/listing/s${i}`,
  }));

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
  it("is the middle half of the sale prices", () => {
    const est = thriftEstimate(sold(TEN), NONE);
    expect(est.low).toBe(44.5);
    expect(est.typical).toBe(49);
    expect(est.high).toBe(58.75);
    expect(estimateText(est)).toBe("$45–$59");
    expect(howText(est)).toMatch(
      /^The middle half of 10 recent Poshmark sales, with a typical sale at \$49\./,
    );
  });

  it("gives no estimate with too few sales", () => {
    const est = thriftEstimate(sold([25, 32, 48]), NONE);
    expect(est.low).toBeNull();
    expect(estimateText(est)).toBe("No estimate");
    expect(thriftVerdict(5, est)).toBe("unsure");
    expect(verdictLine("unsure", 5, est)).toBe(
      "Only 3 matching sales on Poshmark. That's too few to judge.",
    );
    expect(confidence(est, true).level).toBe("Low");
  });

  it("leaves sales marked as not a match out", () => {
    const est = thriftEstimate(sold(TEN), new Set(["s0", "s1", "s2", "s3"]));
    expect(est.prices).toEqual([48, 50, 55, 60, 65, 70]);
    expect(est.low).toBe(51.25);
  });

  it("trusts many close prices and a brand read off the tag", () => {
    const many = thriftEstimate(sold([...TEN, ...TEN]), NONE);
    expect(confidence(many, true)).toEqual({
      level: "High",
      why: "brand read from the tag, 20 matching sales, prices close together",
    });
    expect(confidence(many, false).level).toBe("Medium");
    expect(confidence(thriftEstimate(sold(TEN), NONE), false).level).toBe(
      "Low",
    );
  });
});

describe("thriftVerdict", () => {
  const est = thriftEstimate(sold(TEN), NONE);

  it("waits for a tag price", () => {
    expect(thriftVerdict(null, est)).toBeNull();
    expect(verdictLine(null, null, est)).toBe(
      "Type the tag price to get a verdict.",
    );
  });

  it("calls a third of the low end a good find", () => {
    expect(thriftVerdict(14, est)).toBe("good");
    expect(verdictLine("good", 14, est)).toBe(
      "Tag $14 is about a third of the low end of what it sells for.",
    );
    expect(thriftVerdict(25, est)).toBe("fair");
    expect(thriftVerdict(35, est)).toBe("skip");
  });

  it("is not sure when sale prices are spread too wide", () => {
    const wide = thriftEstimate(
      sold([10, 10, 10, 12, 50, 60, 80, 90, 100, 120]),
      NONE,
    );
    expect(thriftVerdict(2, wide)).toBe("unsure");
  });
});

describe("links and search", () => {
  it("builds the search from the brand and detail", () => {
    expect(
      thriftQuery({
        brand: "Levi's",
        itemType: "Jeans or pants",
        detail: " 501 ",
      }),
    ).toBe("levi's 501");
    expect(thriftQuery({ brand: "Coach", itemType: "Bag" })).toBe("coach bag");
  });

  it("opens Poshmark's sold search for the same words", () => {
    const url = new URL(poshmarkSoldUrl("coach bag"));
    expect(url.searchParams.get("query")).toBe("coach bag");
    expect(url.searchParams.get("availability")).toBe("sold_out");
  });
});

describe("soldVerdict", () => {
  it("waits for the sold price, then the tag price", () => {
    expect(soldVerdict(8, null).verdict).toBeNull();
    expect(soldVerdict(null, 30)).toEqual({
      verdict: null,
      line: "Type the tag price to get a verdict.",
    });
  });

  it("judges the tag against what it sold for", () => {
    expect(soldVerdict(9, 30)).toEqual({
      verdict: "good",
      line: "Tag $9 is about a third of the $30 you saw it sell for.",
    });
    expect(soldVerdict(18, 30).verdict).toBe("fair");
    expect(soldVerdict(25, 30).verdict).toBe("skip");
  });
});
