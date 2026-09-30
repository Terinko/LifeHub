import { describe, expect, it } from "vitest";
import { applyClientChips, checkChipsAddUp } from "./endGame";

const seats = {
  a: { name: "Ann", buyIns: 1, finalChips: 4000 },
  b: { name: "Bob", buyIns: 2, finalChips: null },
};

describe("applyClientChips", () => {
  it("uses the counts sent and keeps saved ones for blanks", () => {
    expect(applyClientChips(seats, { a: null, b: "16000" })).toEqual({
      a: { name: "Ann", buyIns: 1, finalChips: 4000 },
      b: { name: "Bob", buyIns: 2, finalChips: 16000 },
    });
  });

  it("rejects a negative or non-numeric count by name", () => {
    expect(() => applyClientChips(seats, { b: -1 })).toThrow(
      "Bob's final chips must be 0 or more",
    );
    expect(() => applyClientChips(seats, { a: "lots" })).toThrow(
      "Ann's final chips must be 0 or more",
    );
  });
});

describe("checkChipsAddUp", () => {
  it("passes when the counts match the buy-ins", () => {
    expect(() =>
      checkChipsAddUp(
        { a: { name: "A", buyIns: 3, finalChips: 30000 } },
        10000,
      ),
    ).not.toThrow();
  });

  it("says how many chips are missing", () => {
    expect(() =>
      checkChipsAddUp(
        {
          a: { name: "A", buyIns: 2, finalChips: 15500 },
          b: { name: "B", buyIns: 1, finalChips: null },
        },
        10000,
      ),
    ).toThrow(
      "The chips don't add up: 15,500 counted but 30,000 were bought in (14,500 missing). Recount before settling.",
    );
  });

  it("says how many chips are extra", () => {
    expect(() =>
      checkChipsAddUp(
        { a: { name: "A", buyIns: 1, finalChips: 10500 } },
        10000,
      ),
    ).toThrow("(500 extra)");
  });
});
