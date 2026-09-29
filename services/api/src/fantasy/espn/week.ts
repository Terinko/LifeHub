import { normTeam } from "../positions";
import {
  LeagueError,
  recordString,
  round1,
  type LeagueWeek,
  type RawSide,
  type RawStarter,
} from "../guide/types";
import type { EspnLeague, EspnRosterEntry, EspnTeam } from "./api";
import { BENCH_SLOTS, POSITIONS, PRO_TEAMS } from "./constants";

function starter(entry: EspnRosterEntry, week: number): RawStarter | null {
  if (BENCH_SLOTS.has(entry.lineupSlotId)) return null;
  const player = entry.playerPoolEntry?.player ?? entry.player;
  if (!player) return null;
  // statSourceId 0 = actual points (1 is ESPN's projection).
  const actual = player.stats?.find(
    (s) => s.scoringPeriodId === week && s.statSourceId === 0,
  );
  return {
    name: player.fullName,
    pos: POSITIONS[player.defaultPositionId] ?? "OTHER",
    team: normTeam(PRO_TEAMS[player.proTeamId] ?? "FA"),
    points: actual ? round1(actual.appliedTotal) : null,
  };
}

export function espnTeamName(team: EspnTeam): string {
  if (team.name && team.name !== "Unknown") return team.name;
  return (
    `${team.location ?? ""} ${team.nickname ?? ""}`.trim() || "Unknown team"
  );
}

function side(team: EspnTeam, week: number): RawSide {
  const starters = (team.roster?.entries ?? []).flatMap((e) => {
    const s = starter(e, week);
    return s ? [s] : [];
  });
  const overall = team.record?.overall;
  return {
    name: espnTeamName(team),
    record: recordString(overall?.wins, overall?.losses, overall?.ties),
    // ESPN's matchup totalPoints sits at 0 until the week is closed out, while
    // each player's actual points update live, so the score is their sum.
    score: round1(starters.reduce((sum, s) => sum + (s.points ?? 0), 0)),
    starters,
  };
}

/**
 * ESPN schedules by matchup period, which can span several NFL weeks (often
 * in the playoffs), so find the period that contains this week.
 */
export function matchupPeriodFor(league: EspnLeague, week: number): number {
  const periods = league.settings?.scheduleSettings?.matchupPeriods ?? {};
  const found = Object.entries(periods).find(([, weeks]) =>
    weeks.includes(week),
  );
  return found ? Number(found[0]) : week;
}

/** Your side and your opponent's for one ESPN league and NFL week. */
export function espnWeek(
  league: EspnLeague,
  teamId: string,
  week: number,
): LeagueWeek {
  const teams = league.teams ?? [];
  const myTeam = teams.find((t) => String(t.id) === teamId);
  if (!myTeam) {
    throw new LeagueError(
      "Couldn't find your team in this league. Check the team ID in My Leagues.",
    );
  }
  const period = matchupPeriodFor(league, week);
  const game = (league.schedule ?? []).find(
    (m) =>
      m.matchupPeriodId === period &&
      (m.home?.teamId === myTeam.id || m.away?.teamId === myTeam.id),
  );
  const oppId =
    game && (game.home?.teamId === myTeam.id ? game.away : game.home)?.teamId;
  const oppTeam = oppId == null ? undefined : teams.find((t) => t.id === oppId);

  const me = side(myTeam, week);
  if (!(league.schedule ?? []).length)
    return { kind: "notStarted", me, opp: null };
  if (!oppTeam) return { kind: "bye", me, opp: null };
  return { kind: "matchup", me, opp: side(oppTeam, week) };
}
