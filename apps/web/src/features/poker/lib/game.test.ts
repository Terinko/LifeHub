import { describe, expect, it } from "vitest";
import { done, game, player, seat } from "../test/fixtures";
import {
  chipCheck,
  chipColor,
  initials,
  isStale,
  lastSetup,
  myNet,
  potOf,
  previewNet,
  resultsOf,
  seatedIds,
  splitItems,
} from "./game";

describe("game", () => {
  const live = game("a", {
    "PLAYER#1": seat("Tyler", 2),
    "PLAYER#2": seat("Sam", 1),
  });

  it("splits the roster, running games and history", () => {
    const old = done("b", "2026-09-01T00:00:00Z", {
      "PLAYER#1": ["Tyler", 1, 5],
    });
    const newer = done("c", "2026-09-20T00:00:00Z", {
      "PLAYER#1": ["Tyler", 1, 5],
    });
    const split = splitItems([
      player("2", "Sam"),
      old,
      live,
      player("1", "Alex"),
      newer,
    ]);
    expect(split.players.map((p) => p.name)).toEqual(["Alex", "Sam"]);
    expect(split.activeGames).toEqual([live]);
    expect(split.pastGames).toEqual([newer, old]);
    expect([...seatedIds(split.activeGames)]).toEqual(["PLAYER#1", "PLAYER#2"]);
  });

  it("totals the pot in buy-ins, dollars and chips", () => {
    expect(potOf(live)).toEqual({ buyIns: 3, dollars: 30, chips: 3000 });
  });

  it("previews a result from a typed count", () => {
    expect(previewNet(seat("Tyler", 2), live, 3500)).toBe(15);
    expect(previewNet(seat("Tyler", 2), live, null)).toBe(-20);
  });

  it("only balances when every chip bought in is counted", () => {
    expect(chipCheck(live, { "PLAYER#1": 2000 })).toEqual({
      expected: 3000,
      counted: 2000,
      balanced: false,
    });
    expect(
      chipCheck(live, { "PLAYER#1": 2500, "PLAYER#2": 500 }).balanced,
    ).toBe(true);
  });

  it("starts the next game from the latest one", () => {
    expect(lastSetup([])).toBeNull();
    const older = done(
      "b",
      "2026-09-01T00:00:00Z",
      { "PLAYER#9": ["Old", 1, 0] },
      { buyInAmount: 5 },
    );
    const latest = done(
      "c",
      "2026-09-20T00:00:00Z",
      { "PLAYER#1": ["Tyler", 1, 0] },
      { buyInAmount: 20, chipsPerBuyIn: 500 },
    );
    expect(lastSetup([older, latest])).toEqual({
      buyIn: 20,
      chips: 500,
      playerIds: ["PLAYER#1"],
    });
  });

  it("finds my result and ranks everyone's", () => {
    const g = done("d", "2026-09-20T00:00:00Z", {
      "PLAYER#1": ["Tyler", 1, -5],
      "PLAYER#2": ["Sam", 1, 5],
    });
    expect(myNet(g, ["PLAYER#1"])).toBe(-5);
    expect(myNet(g, ["PLAYER#7"])).toBeNull();
    expect(resultsOf(g).map((r) => r.name)).toEqual(["Sam", "Tyler"]);
  });

  it("makes initials and a stable chip color", () => {
    expect(initials("Tyler")).toBe("TY");
    expect(initials("Jordan  Park")).toBe("JP");
    expect(initials("  ")).toBe("?");
    expect(chipColor("PLAYER#1")).toBe(chipColor("PLAYER#1"));
  });

  it("flags games left running over a day", () => {
    const now = Date.parse("2026-09-28T00:00:00Z");
    expect(isStale("2026-09-26T00:00:00Z", now)).toBe(true);
    expect(isStale("2026-09-27T12:00:00Z", now)).toBe(false);
  });
});
