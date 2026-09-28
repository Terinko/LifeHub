import { describe, expect, it } from "vitest";
import { parseEspnTeamLink } from "./espnLink";

describe("parseEspnTeamLink", () => {
  it("reads league and team ids from a team page link", () => {
    expect(
      parseEspnTeamLink(
        " https://fantasy.espn.com/football/team?leagueId=123456&teamId=7&seasonId=2026 ",
      ),
    ).toEqual({ leagueId: "123456", teamId: "7" });
    expect(
      parseEspnTeamLink("fantasy.espn.com/football/team?teamId=3&leagueId=99"),
    ).toEqual({ leagueId: "99", teamId: "3" });
  });

  it("rejects links that aren't ESPN team pages", () => {
    expect(
      parseEspnTeamLink("https://fantasy.espn.com/football/league?leagueId=1"),
    ).toBeNull();
    expect(
      parseEspnTeamLink("https://example.com/?leagueId=1&teamId=2"),
    ).toBeNull();
    expect(parseEspnTeamLink("not a link")).toBeNull();
  });
});
