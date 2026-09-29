import { describe, expect, it } from "vitest";
import {
  formatShortMoney,
  formatShortSigned,
  formatSigned,
  parseChips,
  round2,
  trendOf,
} from "./money";

describe("money", () => {
  it("rounds to whole cents", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(-7.005)).toBe(-7);
  });

  it("always shows the sign so results don't rely on color", () => {
    expect(formatSigned(20)).toBe("+$20.00");
    expect(formatSigned(-25)).toBe("−$25.00");
    expect(formatSigned(0.001)).toBe("$0.00");
    expect(formatShortSigned(5)).toBe("+$5");
    expect(formatShortSigned(-7.5)).toBe("−$7.50");
    expect(formatShortMoney(80)).toBe("$80");
  });

  it("calls tiny leftovers even", () => {
    expect(trendOf(0.004)).toBe("even");
    expect(trendOf(-0.01)).toBe("down");
  });

  it("reads chip counts typed with commas, and blank as not counted", () => {
    expect(parseChips("12,500")).toBe(12500);
    expect(parseChips("")).toBeNull();
    expect(parseChips("abc")).toBeNull();
  });
});
