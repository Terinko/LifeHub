import { describe, expect, it } from "vitest";
import { sleeperWeek } from "./week";

const players = {
  "1": { name: "Josh Allen", team: "BUF", pos: "QB" as const },
  "2": { name: "Bijan Robinson", team: "ATL", pos: "RB" as const },
};
const users = [
  {
    user_id: "me",
    display_name: "tyler",
    metadata: { team_name: "Tyler's Team" },
  },
  { user_id: "them", display_name: "kings" },
];
const rosters = [
  { roster_id: 1, owner_id: "me", settings: { wins: 3, losses: 0 } },
  { roster_id: 2, owner_id: "them", settings: { wins: 1, losses: 2 } },
];

describe("sleeperWeek", () => {
  it("builds both sides with starters, points and records", () => {
    const week = sleeperWeek({
      userId: "me",
      users,
      rosters,
      players,
      matchups: [
        {
          roster_id: 1,
          matchup_id: 4,
          points: 20.5,
          starters: ["1", "0"],
          players_points: { "1": 20.5 },
        },
        {
          roster_id: 2,
          matchup_id: 4,
          points: 7,
          starters: ["2", "WAS"],
          players_points: { "2": 7 },
        },
      ],
    });
    expect(week.kind).toBe("matchup");
    expect(week.me).toEqual({
      name: "Tyler's Team",
      record: "3-0",
      score: 20.5,
      starters: [{ name: "Josh Allen", pos: "QB", team: "BUF", points: 20.5 }],
    });
    expect(week.opp?.name).toBe("kings");
    expect(week.opp?.starters[1]).toEqual({
      name: "WAS Defense",
      pos: "DEF",
      team: "WSH",
      points: null,
    });
  });

  it("reports a bye when the matchup has no opponent", () => {
    const week = sleeperWeek({
      userId: "me",
      users,
      rosters,
      players,
      matchups: [{ roster_id: 1, matchup_id: null, starters: [] }],
    });
    expect(week).toMatchObject({ kind: "bye", opp: null });
  });

  it("says the league hasn't started when there are no matchups", () => {
    expect(
      sleeperWeek({ userId: "me", users, rosters, players, matchups: [] }).kind,
    ).toBe("notStarted");
  });

  it("fails clearly when you have no roster in the league", () => {
    expect(() =>
      sleeperWeek({ userId: "nobody", users, rosters, players, matchups: [] }),
    ).toThrow(/Couldn't find your team/);
  });
});
