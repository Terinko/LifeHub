import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type LiveFeed, parseLive } from "./sidearmLive";

const feed = JSON.parse(
  readFileSync(
    new URL("../fixtures/sidearm-live.json", import.meta.url),
    "utf8",
  ),
) as LiveFeed;

describe("Sidearm live stats", () => {
  it("reads goals, goalies and shots for the game's own date", () => {
    const box = parseLive(feed, "2026-10-03");
    expect(box?.goals).toHaveLength(9);
    expect(box?.goals[0]).toEqual({
      period: "1st",
      time: "3:20",
      team: "Quinnipiac",
      scorer: "Jack Stockfish",
      assists: ["Dylan Edwards", "Antonin Verreault"],
      tags: [],
    });
    expect(box?.goals[1]).toMatchObject({
      team: "Merrimack",
      scorer: "Parker Lalonde",
      tags: ["PP"],
    });
    expect(box?.goals.at(-1)).toMatchObject({
      period: "3rd",
      time: "18:05",
      assists: [],
    });
    expect(box?.shots).toEqual([
      { team: "Merrimack", total: 28 },
      { team: "Quinnipiac", total: 41 },
    ]);
    expect(box?.goalies).toContainEqual({
      team: "Quinnipiac",
      name: "R. Applebee",
      decision: "",
      minutes: "",
      goalsAgainst: 3,
      saves: 25,
    });
  });

  it("ignores the feed when it holds another day's game", () => {
    expect(parseLive(feed, "2026-10-04")).toBeUndefined();
  });

  it("ignores a game that hasn't started", () => {
    const pregame = { ...feed, Game: { ...feed.Game, HasStarted: false } };
    expect(parseLive(pregame, "2026-10-03")).toBeUndefined();
  });
});
