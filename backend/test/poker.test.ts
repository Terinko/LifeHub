// eslint-disable-next-line @typescript-eslint/no-require-imports
const { calculateSettlements, chipTotals } = require("../lambda/poker/index.js");

type Player = { name: string; buyIns: number; finalChips: number | null };

const game = (players: Record<string, Player>) => players;

describe("calculateSettlements", () => {
  test("pays winners exactly what losers owe", () => {
    const result = calculateSettlements(
      game({
        a: { name: "A", buyIns: 1, finalChips: 20000 },
        b: { name: "B", buyIns: 2, finalChips: 5000 },
        c: { name: "C", buyIns: 1, finalChips: 15000 },
      }),
      10,
      10000,
    );
    expect(result.players.a.net).toBe(10);
    expect(result.players.b.net).toBe(-15);
    expect(result.players.c.net).toBe(5);
    expect(result.settlements).toEqual([
      { from: "B", fromId: "b", to: "A", toId: "a", amount: 10 },
      { from: "B", fromId: "b", to: "C", toId: "c", amount: 5 },
    ]);
  });

  test("keeps every payment in whole cents", () => {
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
    const paid = result.settlements.reduce((sum: number, s: { amount: number }) => sum + s.amount, 0);
    expect(Math.round(paid * 100) / 100).toBe(30.3);
  });

  test("treats a blank count as 0 chips", () => {
    const result = calculateSettlements(
      game({
        a: { name: "A", buyIns: 1, finalChips: 20000 },
        b: { name: "B", buyIns: 1, finalChips: null },
      }),
      10,
      10000,
    );
    expect(result.players.b.net).toBe(-10);
  });
});

describe("chipTotals", () => {
  test("compares chips counted with chips bought in", () => {
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
