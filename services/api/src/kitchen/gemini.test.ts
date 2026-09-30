import { describe, expect, it } from "vitest";
import { toIngredients } from "./gemini";

const reply = (text: string) => ({
  candidates: [{ content: { parts: [{ text }] } }],
});

describe("toIngredients", () => {
  it("keeps named rows and drops the rest", () => {
    expect(
      toIngredients(
        reply(
          JSON.stringify([
            { name: "eggs", quantity: 2 },
            { name: "cheese" },
            { name: " ", quantity: 1 },
            { quantity: 3 },
            { name: "milk", quantity: 0.25, unit: "cup" },
          ]),
        ),
      ),
    ).toEqual([
      { name: "eggs", quantity: 2 },
      { name: "cheese" },
      { name: "milk", quantity: 0.25, unit: "cup" },
    ]);
  });

  it("returns nothing for an empty or broken reply", () => {
    expect(toIngredients({})).toEqual([]);
    expect(toIngredients(reply("not json"))).toEqual([]);
  });
});
