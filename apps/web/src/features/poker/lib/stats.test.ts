import { describe, expect, it } from "vitest";
import { done } from "../test/fixtures";
import {
  bankroll,
  hallOfFame,
  headToHead,
  leaderboard,
  monthlyActivity,
  myStats,
} from "./stats";

const g1 = done(
  "1",
  "2026-08-01T03:00:00Z",
  { "PLAYER#me": ["Tyler", 1, 20], "PLAYER#s": ["Sam", 3, -20] },
  {
    settlements: [
      {
        from: "Sam",
        fromId: "PLAYER#s",
        to: "Tyler",
        toId: "PLAYER#me",
        amount: 20,
      },
    ],
  },
);
const g2 = done(
  "2",
  "2026-09-01T03:00:00Z",
  { "PLAYER#me": ["Tyler", 2, -5], "PLAYER#s": ["Sam", 2, 5] },
  {
    settlements: [
      {
        from: "Tyler",
        fromId: "PLAYER#me",
        to: "Sam",
        toId: "PLAYER#s",
        amount: 5,
      },
    ],
  },
);
const g3 = done("3", "2026-09-08T03:00:00Z", {
  "PLAYER#me": ["Tyler", 1, 10],
  "PLAYER#a": ["Alex", 4, -10],
});

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
  });

  it("hands out the Hall of Fame", () => {
    const fame = hallOfFame([g1, g2, g3]);
    expect(fame?.tiltMaster).toEqual({ name: "Alex", value: 4 });
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
