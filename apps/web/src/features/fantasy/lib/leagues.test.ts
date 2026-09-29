import { describe, expect, it } from "vitest";
import type { LinkedLeague } from "@lifehub/shared";
import { leagueDetail, leagueMonogram, leagueTitle } from "./leagues";

const espn: LinkedLeague = {
  sk: "LEAGUE#ESPN#123456",
  platform: "ESPN",
  leagueId: "123456",
  nickname: null,
  leagueName: null,
  season: "2026",
  espnTeamId: "7",
  hasCookies: true,
  linkedAt: "",
};

describe("league labels", () => {
  it("prefers the nickname, then the league's name, then a fallback", () => {
    expect(
      leagueTitle({ ...espn, nickname: "Work", leagueName: "Office" }),
    ).toBe("Work");
    expect(leagueTitle({ ...espn, leagueName: "Office League" })).toBe(
      "Office League",
    );
    expect(leagueTitle(espn)).toBe("ESPN league 3456");
  });

  it("describes the platform, team and privacy", () => {
    expect(leagueDetail(espn)).toBe("ESPN · Team 7 · Private · 2026");
  });

  it("makes a two-letter monogram", () => {
    expect(leagueMonogram({ ...espn, leagueName: "Dynasty Degenerates" })).toBe(
      "DD",
    );
  });
});
