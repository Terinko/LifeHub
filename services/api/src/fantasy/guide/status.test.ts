import { describe, expect, it } from "vitest";
import type { GameState, Starter } from "@lifehub/shared";
import { matchupStatus } from "./status";

const s = (name: string, gameState: GameState): Starter => ({
  name,
  pos: "RB",
  team: "KC",
  points: null,
  gameState,
});

describe("matchupStatus", () => {
  it("is pregame when nobody has kicked off", () => {
    expect(
      matchupStatus(0, 0, [s("A", "pre"), s("B", "bye")], [s("C", "pre")]),
    ).toMatchObject({ phase: "pregame", myLeft: ["A"], oppLeft: ["C"] });
  });

  it("lists both sides' remaining players while live", () => {
    expect(
      matchupStatus(
        112.4,
        98.7,
        [s("A", "post"), s("B", "in"), s("C", "pre")],
        [s("D", "pre")],
      ),
    ).toEqual({
      phase: "live",
      lead: 13.7,
      myLeft: ["B", "C"],
      oppLeft: ["D"],
    });
  });

  it("is final once every starter's game is over", () => {
    expect(
      matchupStatus(
        80,
        90.3,
        [s("A", "post")],
        [s("B", "post"), s("C", "bye")],
      ),
    ).toEqual({ phase: "final", lead: -10.3, myLeft: [], oppLeft: [] });
  });
});
