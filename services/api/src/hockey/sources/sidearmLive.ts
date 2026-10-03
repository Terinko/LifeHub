import type { HockeyGoal, HockeyGoalie } from "@lifehub/shared";

// Sidearm Live Stats: the feed behind Quinnipiac's in-game stats page. It
// always holds the school's current (or most recent) game, and is the only
// source of goals and goalies until the box score is posted after the game.
export const LIVE_URL =
  "https://sidearmstats.com/quinnipiac/mhockey/game.json?detail=full";
export const LIVE_PAGE = "https://gobobcats.com/sidearmstats/mhockey";

type Side = "HomeTeam" | "VisitingTeam";
const SIDES: Side[] = ["VisitingTeam", "HomeTeam"];

type Person = { Team?: string; FirstName?: string; LastName?: string };
type Play = {
  Type?: string;
  Period?: number;
  ClockSeconds?: number;
  Narrative?: string;
  Player?: Person | null;
};
type TeamStats = {
  Totals?: { Values?: Record<string, string> };
  PlayerGroups?: {
    Goalies?: { Values?: Record<string, string>[] };
  };
};
export type LiveFeed = {
  Game?: {
    Date?: string;
    HasStarted?: boolean;
    Attendance?: number;
    HomeTeam?: { Name?: string };
    VisitingTeam?: { Name?: string };
  };
  Stats?: Partial<Record<Side, TeamStats>>;
  Plays?: Play[];
};

export type LiveBox = {
  goals: HockeyGoal[];
  goalies: HockeyGoalie[];
  shots: { team: string; total: number }[];
  attendance?: number;
};

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** "10/3/2026" → "2026-10-03" */
function isoDate(text = "") {
  const m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return undefined;
  return `${m[3]}-${(m[1] ?? "").padStart(2, "0")}-${(m[2] ?? "").padStart(2, "0")}`;
}

/** "#7/8 Quinnipiac" → "Quinnipiac" */
const teamName = (name = "") => name.replace(/^#\S+\s+/, "").trim();

const personName = (p?: Person | null) =>
  [p?.FirstName, p?.LastName].filter(Boolean).join(" ");

/** 1 → "1st", 4 → "OT", 5 → "2OT" (same labels as the posted box score) */
const periodLabel = (n = 0) =>
  n > 3
    ? n === 4
      ? "OT"
      : `${n - 3}OT`
    : (["", "1st", "2nd", "3rd"][n] ?? "");

/** Seconds into the period → "3:20" (the feed's clock counts up) */
const clock = (s = 0) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** "Last,First" → "First Last" */
const displayName = (name: string) => {
  const [last, first] = name.split(/,\s*/);
  return first ? `${first} ${last}` : name;
};

// The play's involved players sometimes include whoever was on the ice
// (a goalie, say), so assists come from the narrative instead:
// "...; Assist by Edwards,Dylan and Verreault,Antonin; On ice for ..."
const assistsIn = (narrative: string) => {
  const m = narrative.match(/Assist by ([^;]+)/i);
  return m
    ? (m[1] ?? "").split(/\s+and\s+/).map((n) => displayName(n.trim()))
    : [];
};

const GOAL_TYPES: [RegExp, string][] = [
  [/POWER-?\s?PLAY/i, "PP"],
  [/SHORT-?\s?HANDED/i, "SH"],
  [/EMPTY\s?NET/i, "EN"],
];

/**
 * The game in the live feed as box score detail, or undefined when the
 * feed holds a different day's game or this one hasn't started.
 */
export function parseLive(feed: LiveFeed, date: string): LiveBox | undefined {
  const game = feed.Game;
  if (!game?.HasStarted || isoDate(game.Date) !== date) return undefined;
  const names: Record<Side, string> = {
    HomeTeam: teamName(game.HomeTeam?.Name),
    VisitingTeam: teamName(game.VisitingTeam?.Name),
  };
  const sideOf = (p?: Person | null) =>
    p?.Team === "HomeTeam" || p?.Team === "VisitingTeam" ? p.Team : undefined;

  const goals: HockeyGoal[] = (feed.Plays ?? [])
    .filter((p) => p.Type === "Goal")
    .map((p) => {
      const side = sideOf(p.Player);
      const narrative = p.Narrative ?? "";
      return {
        period: periodLabel(p.Period),
        time: clock(p.ClockSeconds),
        team: side ? names[side] : "",
        scorer: personName(p.Player),
        assists: assistsIn(narrative),
        tags: GOAL_TYPES.filter(([re]) => re.test(narrative)).map(
          ([, tag]) => tag,
        ),
      };
    });

  const goalies: HockeyGoalie[] = SIDES.flatMap((side) =>
    (feed.Stats?.[side]?.PlayerGroups?.Goalies?.Values ?? []).map((g) => ({
      team: names[side],
      name: (g.Name ?? "").replace(
        /\b(\w)(\w*)/g,
        (_, a: string, b: string) => a + b.toLowerCase(),
      ),
      decision: "",
      minutes: "",
      goalsAgainst: num(g.GoalsAllowed),
      saves: num(g.Saves),
    })),
  );

  const shots = SIDES.flatMap((side) => {
    const total = feed.Stats?.[side]?.Totals?.Values?.Shots;
    return total === undefined
      ? []
      : [{ team: names[side], total: num(total) }];
  });

  return {
    goals,
    goalies,
    shots,
    ...(game.Attendance ? { attendance: game.Attendance } : {}),
  };
}
