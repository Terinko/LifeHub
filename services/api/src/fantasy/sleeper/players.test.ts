import { describe, expect, it } from "vitest";
import { trimPlayers } from "./players";

describe("trimPlayers", () => {
  it("keeps rostered fantasy positions with name, team and position", () => {
    expect(
      trimPlayers({
        "1": { full_name: "Josh Allen", team: "BUF", position: "QB" },
        "2": {
          first_name: "Free",
          last_name: "Agent",
          team: null,
          position: "WR",
        },
        "3": { full_name: "Some Lineman", team: "BUF", position: "OT" },
        "4": {
          first_name: "Only",
          last_name: "Parts",
          team: "KC",
          position: "TE",
        },
        "5": null,
      }),
    ).toEqual({
      "1": { name: "Josh Allen", team: "BUF", pos: "QB" },
      "4": { name: "Only Parts", team: "KC", pos: "TE" },
    });
  });
});
