import { describe, expect, it } from "vitest";
import { teamGameStates, toGame, type ScoreboardEvent } from "./scoreboard";

const event: ScoreboardEvent = {
  id: "401",
  shortName: "KC @ WAS",
  date: "2026-10-04T17:00Z",
  competitions: [
    {
      status: { type: { state: "in", shortDetail: "3rd 4:12" } },
      competitors: [
        { homeAway: "home", score: "21", team: { abbreviation: "WAS" } },
        { homeAway: "away", score: "17", team: { abbreviation: "KC" } },
      ],
      broadcasts: [{ names: ["NBC"] }],
    },
  ],
};

describe("scoreboard", () => {
  it("knows each team's game state and treats absent teams as on bye", () => {
    const stateOf = teamGameStates([event]);
    expect(stateOf("WSH")).toBe("in");
    expect(stateOf("KC")).toBe("in");
    expect(stateOf("HOU")).toBe("bye");
  });

  it("maps an event to a game with normalized team codes", () => {
    expect(toGame(event)).toEqual({
      id: "401",
      shortName: "KC @ WAS",
      date: "2026-10-04T17:00Z",
      state: "in",
      detail: "3rd 4:12",
      broadcast: "NBC",
      teams: [
        { abbreviation: "WSH", score: "21", homeAway: "home" },
        { abbreviation: "KC", score: "17", homeAway: "away" },
      ],
    });
  });
});
