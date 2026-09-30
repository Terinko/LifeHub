import { describe, expect, it } from "vitest";
import type { PantryItem } from "@lifehub/shared";
import { formatAll, formatAmount, formatNumber } from "./format";
import { mealLineState, isLow } from "./pantry";
import { guessAisle, guessLocation } from "./places";
import { parseQuickAdd } from "./quickAdd";

describe("parseQuickAdd", () => {
  it.each([
    ["2 lb ground beef", { name: "ground beef", quantity: 2, unit: "lb" }],
    ["1/2 cup rice", { name: "rice", quantity: 0.5, unit: "cup" }],
    ["1½ gal milk", { name: "milk", quantity: 1.5, unit: "gal" }],
    ["3 bananas", { name: "bananas", quantity: 3, unit: "" }],
    ["2 fl oz vanilla", { name: "vanilla", quantity: 2, unit: "fl oz" }],
    ["1 bag spinach", { name: "spinach", quantity: 1, unit: "bag" }],
    ["milk", { name: "milk", quantity: 1, unit: "" }],
    ["eggs x12", { name: "eggs", quantity: 12, unit: "" }],
    ["7up", { name: "7up", quantity: 1, unit: "" }],
    ["2 cans", { name: "cans", quantity: 2, unit: "" }],
  ])("reads %s", (text, expected) => {
    expect(parseQuickAdd(text)).toEqual(expected);
  });

  it("ignores blank input", () => {
    expect(parseQuickAdd("   ")).toBe(null);
  });
});

describe("formatting", () => {
  it("shows common fractions", () => {
    expect(formatNumber(1.5)).toBe("1½");
    expect(formatNumber(0.25)).toBe("¼");
    expect(formatNumber(2.4)).toBe("2.4");
    expect(formatAmount(6, "")).toBe("6");
    expect(formatAmount(0.5, "bag")).toBe("½ bag");
    expect(
      formatAll(1, { unit: "gal", extra: [{ quantity: 1, unit: "carton" }] }),
    ).toBe("1 gal + 1 carton");
  });
});

describe("guessing places", () => {
  it.each([
    ["Bananas", "Produce"],
    ["Ground beef", "Meat & fish"],
    ["Peanut butter", "Shelf"],
    ["Butter", "Dairy & eggs"],
    ["Ice cream", "Frozen"],
    ["Paper towels", "Household"],
    ["Widgets", "Other"],
  ])("puts %s in %s", (name, aisle) => {
    expect(guessAisle(name)).toBe(aisle);
  });

  it("guesses where pantry items live", () => {
    expect(guessLocation("Eggs")).toBe("fridge");
    expect(guessLocation("Frozen peas")).toBe("freezer");
    expect(guessLocation("Rice")).toBe("shelf");
  });
});

const pantryItem = (over: Partial<PantryItem>): PantryItem => ({
  pk: "INVENTORY",
  sk: "p",
  name: "Eggs",
  currentQuantity: 2,
  unit: "",
  ...over,
});

describe("pantry state", () => {
  it("counts out and under the warning amount as low", () => {
    expect(isLow(pantryItem({ currentQuantity: 0 }))).toBe(true);
    expect(isLow(pantryItem({ lowAt: 2 }))).toBe(true);
    expect(isLow(pantryItem({ lowAt: 1 }))).toBe(false);
    expect(isLow(pantryItem({}))).toBe(false);
  });

  it("describes what a meal line will do", () => {
    const pantry = [
      pantryItem({}),
      pantryItem({ sk: "b", name: "Bread", currentQuantity: 1, unit: "loaf" }),
    ];
    const line = (
      name: string,
      quantity: number,
      unit = "",
      pantrySk: string | null = "p",
    ) => mealLineState({ pantrySk, name, quantity, unit }, pantry);
    expect(line("Eggs", 2)).toEqual({ kind: "ok", text: "2 in pantry" });
    expect(line("Eggs", 3)).toEqual({
      kind: "short",
      text: "Only 2 in pantry",
    });
    expect(line("Bread", 2, "slices", "b")).toEqual({
      kind: "mismatch",
      text: "Units don't match, will skip",
    });
    expect(line("Hot sauce", 1, "", null)).toEqual({ kind: "untracked" });
  });
});

describe("step", () => {
  it("moves counts by one and small measures by a quarter", async () => {
    const { step } = await import("./steps");
    expect(step(2, 1, "")).toBe(3);
    expect(step(0, -1, "")).toBe(0);
    expect(step(1, -1, "cup")).toBe(0.75);
    expect(step(0.5, 1, "cup")).toBe(0.75);
    expect(step(1, 1, "cup")).toBe(2);
    expect(step(1.5, 1, "lb")).toBe(2);
  });
});
