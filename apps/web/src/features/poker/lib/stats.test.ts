import { describe, expect, it } from "vitest";
import { g1, g2, g3 } from "../test/fixtures";
import {
  bankroll,
  hallOfFame,
  headToHead,
  leaderboard,
  monthlyActivity,
  myStats,
  sortLeaders,
} from "./stats";

describe("stats", () => {
  it("adds up my career in order", () => {
    expect(myStats([g3, g1, g2], ["PLAYER#me"])).toEqual({
      gamesPlayed: 3,
      netTotal: 25,
      buyInsTotal: 4,
      winRate: 67,
      biggestWin: 20,
      biggestLoss: -5,
      avgNet: 8.33,
      bestStreak: 1,
      currentStreak: 1,
    });
    expect(myStats([g1], ["PLAYER#nobody"])).toBeNull();
  });

  it("charts my running total", () => {
    expect(bankroll([g2, g1], ["PLAYER#me"])).toEqual([
      { game: 1, net: 20, cumulative: 20 },
      { game: 2, net: -5, cumulative: 15 },
    ]);
  });

  it("nets out money with each opponent", () => {
    expect(headToHead([g1, g2], ["PLAYER#me"])).toEqual([
      { id: "PLAYER#s", name: "Sam", net: 15 },
    ]);
  });

  it("ranks the group", () => {
    const board = leaderboard([g1, g2, g3]);
    expect(board.map((r) => [r.name, r.net, r.games])).toEqual([
      ["Tyler", 25, 3],
      ["Alex", -10, 1],
      ["Sam", -15, 2],
    ]);
    expect(board[0]).toMatchObject({ roi: 63, nightsWon: 2, avgFinish: 1.3 });
    expect(board[2]).toMatchObject({ roi: -30, nightsWon: 1, avgFinish: 1.5 });
    expect(sortLeaders(board, "nightsWon").map((r) => r.name)).toEqual([
      "Tyler",
      "Sam",
      "Alex",
    ]);
  });

  it("hands out the Hall of Fame", () => {
    const fame = hallOfFame([g1, g2, g3]);
    expect(fame?.houdini).toEqual({ name: "Sam", value: 2 });
    expect(fame?.roiKing).toEqual({ name: "Tyler", value: 20 });
    expect(fame?.ironMan).toEqual({ name: "Tyler", value: 3 });
    expect(fame?.swissBank).toEqual({ name: "Alex", value: -10 });
    expect(hallOfFame([])).toBeNull();
  });

  it("counts games a month", () => {
    expect(monthlyActivity([g1, g2, g3]).map((m) => m.count)).toEqual([1, 2]);
  });
});
