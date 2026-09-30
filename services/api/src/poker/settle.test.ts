import { describe, expect, it } from "vitest";
import { calculateSettlements, chipTotals, isPositiveNumber } from "./settle";
import type { Seat } from "./types";

const game = (players: Record<string, Seat>) => players;

describe("calculateSettlements", () => {
  it("pays winners exactly what losers owe", () => {
    const result = calculateSettlements(
      game({
        a: { name: "A", buyIns: 1, finalChips: 20000 },
        b: { name: "B", buyIns: 2, finalChips: 5000 },
        c: { name: "C", buyIns: 1, finalChips: 15000 },
      }),
      10,
      10000,
    );
    expect(result.players.a?.net).toBe(10);
    expect(result.players.b?.net).toBe(-15);
    expect(result.players.c?.net).toBe(5);
    expect(result.settlements).toEqual([
      { from: "B", fromId: "b", to: "A", toId: "a", amount: 10 },
      { from: "B", fromId: "b", to: "C", toId: "c", amount: 5 },
    ]);
  });

  it("keeps every payment in whole cents", () => {
    const result = calculateSettlements(
      game({
        a: { name: "A", buyIns: 3, finalChips: 0 },
        b: { name: "B", buyIns: 1, finalChips: 13333 },
        c: { name: "C", buyIns: 1, finalChips: 26667 },
        d: { name: "D", buyIns: 1, finalChips: 20000 },
      }),
      10.1,
      10000,
    );
    for (const s of result.settlements) {
      expect(Math.round(s.amount * 100) / 100).toBe(s.amount);
    }
    const paid = result.settlements.reduce((sum, s) => sum + s.amount, 0);
    expect(Math.round(paid * 100) / 100).toBe(30.3);
  });

  it("treats a blank count as 0 chips", () => {
    const result = calculateSettlements(
      game({
        a: { name: "A", buyIns: 1, finalChips: 20000 },
        b: { name: "B", buyIns: 1, finalChips: null },
      }),
      10,
      10000,
    );
    expect(result.players.b?.net).toBe(-10);
  });

  it("pays the biggest winner from the biggest loser first", () => {
    const result = calculateSettlements(
      game({
        a: { name: "A", buyIns: 1, finalChips: 0 },
        b: { name: "B", buyIns: 1, finalChips: 5000 },
        c: { name: "C", buyIns: 1, finalChips: 17500 },
        d: { name: "D", buyIns: 1, finalChips: 17500 },
      }),
      20,
      10000,
    );
    expect(result.settlements).toEqual([
      { from: "A", fromId: "a", to: "C", toId: "c", amount: 15 },
      { from: "A", fromId: "a", to: "D", toId: "d", amount: 5 },
      { from: "B", fromId: "b", to: "D", toId: "d", amount: 10 },
    ]);
  });

  it("keeps every other seat field and adds net", () => {
    const result = calculateSettlements(
      game({
        a: { name: "A", buyIns: 1, finalChips: 10000, extra: "kept" },
        b: { name: "B", buyIns: 1, finalChips: 10000 },
      }),
      10,
      10000,
    );
    expect(result.players.a).toEqual({
      name: "A",
      buyIns: 1,
      finalChips: 10000,
      extra: "kept",
      net: 0,
    });
    expect(result.settlements).toEqual([]);
  });
});

describe("chipTotals", () => {
  it("compares chips counted with chips bought in", () => {
    expect(
      chipTotals(
        game({
          a: { name: "A", buyIns: 2, finalChips: 15500 },
          b: { name: "B", buyIns: 1, finalChips: null },
        }),
        10000,
      ),
    ).toEqual({ expected: 30000, counted: 15500 });
  });
});

describe("isPositiveNumber", () => {
  it("only accepts finite numbers above 0", () => {
    expect([1, 0.5].map(isPositiveNumber)).toEqual([true, true]);
    expect([0, -1, "5", NaN, Infinity, null].map(isPositiveNumber)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
  });
});
