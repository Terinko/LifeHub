import { describe, expect, it } from "vitest";
import { done, g1, g2, g3 } from "../test/fixtures";
import { wrappedFor, wrappedText, wrappedYears } from "./wrapped";

describe("wrapped", () => {
  it("only offers years with enough games", () => {
    const old = done("o", "2025-05-01T03:00:00Z", {
      "PLAYER#me": ["Tyler", 1, 5],
      "PLAYER#s": ["Sam", 1, -5],
    });
    expect(wrappedYears([g1, g2, g3, old])).toEqual([2026]);
  });

  it("sums up a year for the group and for me", () => {
    const w = wrappedFor([g1, g2, g3], 2026, "PLAYER#me");
    expect(w).toMatchObject({
      year: 2026,
      games: 3,
      onTable: 130,
      players: 3,
      busiestMonth: { month: "September", games: 2 },
      mvp: { name: "Tyler", net: 25 },
      mostNightsWon: { name: "Tyler", nightsWon: 2 },
      ironMan: { name: "Tyler", games: 3 },
      biggestGame: { value: 50 },
      biggestWin: { name: "Tyler", value: 20 },
      me: {
        net: 25,
        games: 3,
        rank: 1,
        bestNight: { value: 20, gameSk: "GAME#1" },
        favoriteAtm: { name: "Sam" },
      },
    });
    expect(wrappedFor([g1, g2, g3], 2026).me).toBeNull();
    expect(wrappedText(w)).toBe(
      [
        "Poker Wrapped 2026",
        "3 games · $130 on the table · 3 players",
        "MVP: Tyler (+$25)",
        "Most nights won: Tyler (2)",
        "Biggest win: Tyler +$20",
      ].join("\n"),
    );
  });
});
