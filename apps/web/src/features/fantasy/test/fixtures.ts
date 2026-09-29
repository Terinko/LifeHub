import type { Matchup, NflGame } from "@lifehub/shared";

export const matchup: Matchup = {
  leagueSk: "LEAGUE#SLEEPER#1",
  league: "Dynasty Degenerates",
  platform: "SLEEPER",
  url: "https://sleeper.com/leagues/1",
  kind: "matchup",
  me: {
    name: "Tyler's Team",
    record: "3-0",
    score: 112.4,
    starters: [
      {
        name: "Bijan Robinson",
        pos: "RB",
        team: "ATL",
        points: null,
        gameState: "pre",
      },
    ],
  },
  opp: {
    name: "Waiver Wire Kings",
    record: "1-2",
    score: 98.7,
    starters: [
      {
        name: "Kyle Pitts",
        pos: "TE",
        team: "ATL",
        points: null,
        gameState: "pre",
      },
    ],
  },
  status: {
    phase: "live",
    lead: 13.7,
    myLeft: ["Bijan Robinson"],
    oppLeft: ["Kyle Pitts"],
  },
};

export const game = (id: string, state: NflGame["state"]): NflGame => ({
  id,
  shortName: `G${id}`,
  date: "2026-10-04T17:00:00Z",
  state,
  detail: state === "post" ? "Final" : "3rd 4:12",
  broadcast: "NBC",
  teams: [
    { abbreviation: "KC", score: "17", homeAway: "away" },
    { abbreviation: "BUF", score: "21", homeAway: "home" },
  ],
  rootFor: [
    {
      name: `Player ${id}`,
      pos: "RB",
      team: "BUF",
      leagues: [{ league: "Dynasty", points: 14.2 }],
    },
  ],
  rootAgainst: [],
});
