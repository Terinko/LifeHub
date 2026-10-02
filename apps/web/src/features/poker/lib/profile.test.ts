import { describe, expect, it } from "vitest";
import { g1, g2, g3 } from "../test/fixtures";
import { playerProfile } from "./profile";

describe("playerProfile", () => {
  it("adds up a career", () => {
    expect(playerProfile([g3, g2, g1], "PLAYER#me")).toEqual({
      id: "PLAYER#me",
      name: "Tyler",
      games: 3,
      net: 25,
      buyIns: 4,
      spent: 40,
      roi: 63,
      winRate: 67,
      nightsWon: 2,
      avgFinish: 1.3,
      attendance: 100,
      bestNight: 20,
      worstNight: -5,
      currentStreak: 1,
      bestStreak: 1,
      lastFive: ["W", "L", "W"],
      rebuyGames: 1,
      comebacks: 0,
      nemesis: null,
      favoriteAtm: { id: "PLAYER#s", name: "Sam", net: 15 },
      byStakes: [{ buyIn: 10, games: 3, net: 25, roi: 63 }],
      firstPlayed: "2026-08-01T03:00:00Z",
    });
  });

  it("counts comebacks, rivals and attendance since their first game", () => {
    const sam = playerProfile([g1, g2, g3], "PLAYER#s");
    expect(sam).toMatchObject({
      rebuyGames: 2,
      comebacks: 1,
      attendance: 67,
      nemesis: { name: "Tyler", net: -15 },
      favoriteAtm: null,
    });
    expect(playerProfile([g1, g2, g3], "PLAYER#a")?.attendance).toBe(100);
    expect(playerProfile([g1], "PLAYER#a")).toBeNull();
  });
});
