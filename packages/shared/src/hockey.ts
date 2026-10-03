/** The six D-I men's conferences, plus independents. */
export const HOCKEY_CONFERENCES = [
  "aha",
  "b1g",
  "ccha",
  "ecac",
  "he",
  "nchc",
] as const;
export type HockeyConference = (typeof HOCKEY_CONFERENCES)[number];
export type HockeyConferenceOrInd = HockeyConference | "ind";

export const HOCKEY_CONFERENCE_NAMES: Record<HockeyConferenceOrInd, string> = {
  aha: "Atlantic Hockey",
  b1g: "Big Ten",
  ccha: "CCHA",
  ecac: "ECAC",
  he: "Hockey East",
  nchc: "NCHC",
  ind: "Independent",
};

/** One side of a game, from ESPN's scoreboard. */
export type HockeyGameSide = {
  /** ESPN team id */
  id: string;
  /** School name, e.g. "Quinnipiac" */
  name: string;
  abbr: string;
  logo?: string;
  /** Current poll rank; missing when unranked. */
  rank?: number;
  score?: number;
  winner?: boolean;
  /** Goals per period (OT periods included). */
  periods: number[];
};

export type HockeyGameState = "pre" | "in" | "post";

export type HockeyGame = {
  /** ESPN event id */
  id: string;
  /** ISO start time */
  start: string;
  state: HockeyGameState;
  /** ESPN's short status: "Final", "Final/OT", "1:51 - 2nd", "End of 2nd". */
  detail: string;
  venue?: string;
  /** Broadcasts, e.g. ["ESPN+"] */
  tv: string[];
  neutral: boolean;
  away: HockeyGameSide;
  home: HockeyGameSide;
};

/** GET /hockey/scores?date=YYYYMMDD */
export type HockeyScoreboard = { date: string; games: HockeyGame[] };

export type HockeyPollRow = {
  rank: number;
  team: string;
  firstPlaceVotes: number;
  record: string;
  points: number;
  /** null when the team wasn't ranked last week */
  previous: number | null;
};

export type HockeyPollSnapshot = {
  /** "Through Games SEP. 21, 2026" label, as published */
  through: string;
  /** ISO date the snapshot was first seen */
  seenAt: string;
  rows: HockeyPollRow[];
};

/** GET /hockey/poll: the latest USCHO poll and every earlier one we saved. */
export type HockeyPoll = HockeyPollSnapshot & {
  others: { team: string; points: number }[];
  /** Oldest first, including the current one. */
  history: HockeyPollSnapshot[];
};

export type HockeyNpiRow = {
  rank: number;
  team: string;
  npi: number;
  record: string;
};

/** GET /hockey/npi */
export type HockeyNpi = { rows: HockeyNpiRow[] };

export type HockeyStandingsRow = {
  rank: number;
  team: string;
  gamesPlayed: number;
  record: string;
  points: number;
  goals: string;
};

/** GET /hockey/standings/{conference} */
export type HockeyStandings = {
  conference: HockeyConference;
  rows: HockeyStandingsRow[];
};

/** One pickable D-I team (GET /hockey/teams). */
export type HockeyTeamOption = {
  id: string;
  name: string;
  logo?: string;
  conference: HockeyConferenceOrInd;
};

/** GET /hockey/teams/{id}: a team's season schedule. */
export type HockeyTeamSchedule = {
  team: HockeyTeamOption;
  games: HockeyGame[];
};

export type HockeyGoal = {
  period: string;
  time: string;
  /** Team name as the box score prints it */
  team: string;
  scorer: string;
  assists: string[];
  /** "PP", "SH", "EN", "GW" tags */
  tags: string[];
};

export type HockeyGoalie = {
  team: string;
  name: string;
  decision: string;
  minutes: string;
  goalsAgainst: number;
  saves: number;
};

/**
 * GET /hockey/box/{eventId}. Full detail only exists where the school
 * publishes a box score we can read (Quinnipiac today); otherwise
 * `available` is false and the app shows ESPN's line score alone.
 */
export type HockeyBoxScore =
  | { available: false }
  | {
      available: true;
      goals: HockeyGoal[];
      goalies: HockeyGoalie[];
      /** Shots on goal by team, from each team's skater totals */
      shots: { team: string; total: number }[];
      attendance?: number;
      source: string;
    };

// Each source spells some schools differently (ESPN "Massachusetts", the
// poll "UMass", CHN "Mass.-Lowell"), so names are compared by this key.
const NAME_ALIASES: Record<string, string> = {
  massachusetts: "umass",
  connecticut: "uconn",
  masslowell: "umasslowell",
  rensselaer: "rpi",
  miamioh: "miami",
  lakesuperiorstate: "lakesuperior",
  longisland: "liu",
  longislanduniversity: "liu",
  americaninternational: "aic",
  nebraskaomaha: "omaha",
  stthomasmn: "stthomas",
  bostonu: "bostonuniversity",
  augustanasd: "augustana",
  maryvillemo: "maryville",
};

/** A spelling-proof key for a school name: "Mass.-Lowell" → "umasslowell". */
export function hockeyTeamKey(name: string): string {
  const key = name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
  return NAME_ALIASES[key] ?? key;
}

export const sameHockeyTeam = (a: string, b: string) =>
  hockeyTeamKey(a) === hockeyTeamKey(b);
