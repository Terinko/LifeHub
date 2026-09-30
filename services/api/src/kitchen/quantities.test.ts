import { describe, expect, it } from "vitest";
import { normalizeName, sameName, singular } from "@lifehub/shared";
import { addAmount, takeAmount } from "./quantities";

describe("item names", () => {
  it("treats plurals and case as the same item", () => {
    expect(sameName("Tomatoes", "tomato")).toBe(true);
    expect(sameName("eggs", "Egg")).toBe(true);
    expect(sameName("Berries", "berry")).toBe(true);
    expect(sameName("green  beans", "Green bean")).toBe(true);
  });

  it("keeps different items apart", () => {
    expect(sameName("oil", "olive oil")).toBe(false);
    expect(sameName("egg", "eggplant")).toBe(false);
    expect(sameName("salt", "salted butter")).toBe(false);
    expect(sameName("", "")).toBe(false);
  });

  it("leaves words that only look plural", () => {
    expect(singular("hummus")).toBe("hummus");
    expect(singular("glass")).toBe("glass");
    expect(normalizeName("  Cheeses ")).toBe("cheese");
  });
});

describe("addAmount", () => {
  const base = { main: 1, unit: "cup", extra: [] };

  it("folds convertible units into the main amount", () => {
    expect(addAmount(base, 8, "tbsp")).toEqual({
      main: 1.5,
      unit: "cup",
      extra: [],
    });
  });

  it("keeps other units as extras and adds to a matching one", () => {
    const once = addAmount(base, 1, "bag");
    expect(once.extra).toEqual([{ quantity: 1, unit: "bag" }]);
    expect(addAmount(once, 2, "bags").extra).toEqual([
      { quantity: 3, unit: "bag" },
    ]);
  });
});

describe("takeAmount", () => {
  it("takes from the main amount, never below 0", () => {
    expect(takeAmount({ main: 2, unit: "lb", extra: [] }, 16, "oz")).toEqual({
      main: 1,
      unit: "lb",
      extra: [],
    });
    expect(takeAmount({ main: 1, unit: "", extra: [] }, 3, "")?.main).toBe(0);
  });

  it("takes from an extra when that's the unit that matches", () => {
    const left = takeAmount(
      { main: 1, unit: "loaf", extra: [{ quantity: 6, unit: "slice" }] },
      2,
      "slices",
    );
    expect(left).toEqual({
      main: 1,
      unit: "loaf",
      extra: [{ quantity: 4, unit: "slice" }],
    });
  });

  it("refuses units that don't convert", () => {
    expect(takeAmount({ main: 1, unit: "loaf", extra: [] }, 2, "slices")).toBe(
      null,
    );
  });
});
