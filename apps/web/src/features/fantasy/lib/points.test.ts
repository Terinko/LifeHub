import { describe, expect, it } from "vitest";
import type { StakePlayer } from "@lifehub/shared";
import { formatPoints, stakePoints } from "./points";

const cook = (leagues: StakePlayer["leagues"]): StakePlayer => ({
  name: "James Cook",
  pos: "RB",
  team: "BUF",
  leagues,
});

describe("stakePoints", () => {
  it("shows one number when every league agrees", () => {
    expect(
      stakePoints(
        cook([
          { league: "Dynasty", points: 14.2 },
          { league: "Office", points: 14.2 },
        ]),
      ),
    ).toEqual({ points: "14.2", leagues: "Dynasty · Office" });
  });

  it("labels each league's points when they differ", () => {
    expect(
      stakePoints(
        cook([
          { league: "Dynasty", points: 14.2 },
          { league: "Office", points: 9.8 },
        ]),
      ),
    ).toEqual({ points: null, leagues: "Dynasty 14.2 · Office 9.8" });
  });

  it("shows a dash before a player has points", () => {
    expect(formatPoints(null)).toBe("–");
  });
});
