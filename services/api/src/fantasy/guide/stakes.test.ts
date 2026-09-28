import { describe, expect, it } from "vitest";
import type { Starter } from "@lifehub/shared";
import { addStake, stakesFor, type StakeMap } from "./stakes";

const cook: Starter = {
  name: "James Cook",
  pos: "RB",
  team: "BUF",
  points: 14.2,
  gameState: "in",
};

describe("addStake", () => {
  it("merges a player across leagues, keeping each league's points", () => {
    const map: StakeMap = new Map();
    addStake(map, cook, "Dynasty");
    addStake(map, { ...cook, points: 16.7 }, "Office");
    addStake(map, cook, "Dynasty");
    expect(stakesFor(map, ["BUF", "KC"])).toEqual([
      {
        name: "James Cook",
        pos: "RB",
        team: "BUF",
        leagues: [
          { league: "Dynasty", points: 14.2 },
          { league: "Office", points: 16.7 },
        ],
      },
    ]);
  });

  it("skips free agents", () => {
    const map: StakeMap = new Map();
    addStake(map, { ...cook, team: "FA" }, "Dynasty");
    expect(map.size).toBe(0);
  });
});
