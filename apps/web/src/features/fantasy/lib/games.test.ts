import { describe, expect, it } from "vitest";
import type { NflGame } from "@lifehub/shared";
import { gameMeta, groupGames } from "./games";

const player = { name: "A", pos: "QB" as const, team: "BUF", leagues: [] };
const game = (id: string, state: NflGame["state"], stake = true): NflGame => ({
  id,
  shortName: id,
  date: "2026-10-04T17:00:00Z",
  state,
  detail: state === "post" ? "Final" : "3rd 4:12",
  broadcast: "NBC",
  teams: [],
  rootFor: stake ? [player] : [],
  rootAgainst: [],
});

describe("groupGames", () => {
  it("splits stake games by state and leaves the rest apart", () => {
    const groups = groupGames([
      game("a", "post"),
      game("b", "in"),
      game("c", "pre"),
      game("d", "in", false),
    ]);
    expect(groups.live.map((g) => g.id)).toEqual(["b"]);
    expect(groups.upcoming.map((g) => g.id)).toEqual(["c"]);
    expect(groups.finished.map((g) => g.id)).toEqual(["a"]);
    expect(groups.other.map((g) => g.id)).toEqual(["d"]);
  });
});

describe("gameMeta", () => {
  it("shows the clock and network live, and just Final after", () => {
    expect(gameMeta(game("a", "in"))).toBe("3rd 4:12 · NBC");
    expect(gameMeta(game("a", "post"))).toBe("Final");
  });
});
