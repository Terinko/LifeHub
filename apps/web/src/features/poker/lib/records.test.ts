import { describe, expect, it } from "vitest";
import { done, g1, g2, g3 } from "../test/fixtures";
import { recordBook } from "./records";

describe("recordBook", () => {
  it("keeps each record with who set it and when", () => {
    const book = recordBook([g3, g2, g1]);
    expect(book.biggestGame).toMatchObject({ value: 50, gameSk: "GAME#3" });
    expect(book.biggestWin).toMatchObject({
      name: "Tyler",
      value: 20,
      gameSk: "GAME#1",
      buyIn: 10,
    });
    expect(book.biggestLoss).toMatchObject({ name: "Sam", value: -20 });
    expect(book.mostBuyIns).toMatchObject({ name: "Alex", value: 4 });
    expect(book.biggestTable).toMatchObject({ value: 2, gameSk: "GAME#1" });
    expect(book.longestStreak).toBeUndefined();
  });

  it("lets the first to set a record keep it on a tie", () => {
    // g1 and g2 both put $40 on the table; g1 came first.
    expect(recordBook([g2, g1]).biggestGame?.gameSk).toBe("GAME#1");
  });

  it("tracks winning streaks across the games someone played", () => {
    const win = (id: string, at: string) =>
      done(id, at, { "PLAYER#s": ["Sam", 1, 5], "PLAYER#x": ["Xi", 1, -5] });
    const book = recordBook([
      win("a", "2026-01-01T00:00:00Z"),
      win("b", "2026-01-08T00:00:00Z"),
      win("c", "2026-01-15T00:00:00Z"),
    ]);
    expect(book.longestStreak).toMatchObject({
      name: "Sam",
      value: 3,
      gameSk: "GAME#c",
    });
  });
});
