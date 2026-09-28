import { describe, expect, it } from "vitest";
import type { EspnLeague, EspnRosterEntry } from "./api";
import { espnWeek, matchupPeriodFor } from "./week";

const entry = (
  fullName: string,
  lineupSlotId: number,
  defaultPositionId: number,
  points?: number,
): EspnRosterEntry => ({
  lineupSlotId,
  playerPoolEntry: {
    player: {
      fullName,
      proTeamId: 2,
      defaultPositionId,
      stats:
        points === undefined
          ? []
          : [
              { scoringPeriodId: 16, statSourceId: 1, appliedTotal: 99 },
              { scoringPeriodId: 16, statSourceId: 0, appliedTotal: points },
            ],
    },
  },
});

const league: EspnLeague = {
  settings: {
    name: "Office League",
    scheduleSettings: { matchupPeriods: { "14": [14], "15": [15, 16] } },
  },
  teams: [
    {
      id: 7,
      name: "Tyler's Team",
      record: { overall: { wins: 9, losses: 5 } },
      roster: {
        entries: [
          entry("James Cook", 23, 2, 12.34), // FLEX slot, real position RB
          entry("Bench Guy", 20, 3, 30),
        ],
      },
    },
    {
      id: 3,
      location: "Taco",
      nickname: "Corp",
      roster: { entries: [entry("Kyle Pitts", 6, 4)] },
    },
  ],
  schedule: [{ matchupPeriodId: 15, home: { teamId: 3 }, away: { teamId: 7 } }],
};

describe("espnWeek", () => {
  it("uses real positions, skips the bench and sums actual points", () => {
    const week = espnWeek(league, "7", 16);
    expect(week.kind).toBe("matchup");
    expect(week.me).toEqual({
      name: "Tyler's Team",
      record: "9-5",
      score: 12.3,
      starters: [{ name: "James Cook", pos: "RB", team: "BUF", points: 12.3 }],
    });
    expect(week.opp).toMatchObject({ name: "Taco Corp", score: 0 });
  });

  it("maps an NFL week to a multi-week matchup period", () => {
    expect(matchupPeriodFor(league, 16)).toBe(15);
    expect(matchupPeriodFor(league, 3)).toBe(3);
  });

  it("reports a bye when there is no game that period", () => {
    expect(espnWeek(league, "7", 14).kind).toBe("bye");
  });

  it("fails clearly when the team id is wrong", () => {
    expect(() => espnWeek(league, "99", 16)).toThrow(/Couldn't find your team/);
  });
});
