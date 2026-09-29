import type {
  FantasyGuide,
  GameState,
  LeagueProblem,
  Matchup,
  StakePlayer,
  TeamSide,
} from "@lifehub/shared";
import { HttpError } from "../../shared/http";
import * as repo from "../repository";
import { getState } from "../sleeper/api";
import { getSleeperPlayers, type PlayerMap } from "../sleeper/players";
import { leagueLabel, loadLeague, type LoadedLeague } from "./loadLeague";
import { fetchScoreboard, teamGameStates, toGame } from "./scoreboard";
import { addStake, stakesFor, type StakeMap } from "./stakes";
import { matchupStatus } from "./status";
import { LeagueError, type RawSide } from "./types";

const EMPTY: FantasyGuide = {
  week: null,
  season: null,
  leaguesLinked: 0,
  matchups: [],
  byePlayers: [],
  games: [],
  leagueErrors: [],
};

type StateOf = (team: string) => GameState;

const withStates = (side: RawSide, stateOf: StateOf): TeamSide => ({
  ...side,
  starters: side.starters.map((s) => ({ ...s, gameState: stateOf(s.team) })),
});

function toMatchup(
  leagueSk: string,
  platform: Matchup["platform"],
  { label, url, week }: LoadedLeague,
  stateOf: StateOf,
): Matchup {
  const me = withStates(week.me, stateOf);
  const opp = week.opp && withStates(week.opp, stateOf);
  return {
    leagueSk,
    league: label,
    platform,
    url,
    kind: week.kind,
    me,
    opp,
    status: opp
      ? matchupStatus(me.score, opp.score, me.starters, opp.starters)
      : null,
  };
}

function problemMessage(error: unknown) {
  if (error instanceof LeagueError) return error.message;
  console.error("Fantasy league failed to load:", error);
  return "Couldn't load this league right now. Try again shortly.";
}

/** This week's matchups, bye players and NFL games, cross-referenced. */
export async function buildGuide(
  userId: string,
  weekOverride?: number,
): Promise<FantasyGuide> {
  const leagues = await repo.listLeagues(userId);
  if (leagues.length === 0) return EMPTY;

  const state = await getState();
  const week = weekOverride || state.week || 1;
  const season = String(state.season);
  const leagueErrors: LeagueProblem[] = [];

  let sleeperPlayers: PlayerMap = {};
  if (leagues.some((l) => l.platform === "SLEEPER")) {
    sleeperPlayers = await getSleeperPlayers().catch((error: unknown) => {
      console.error("Failed to refresh Sleeper players:", error);
      leagueErrors.push({
        league: "Sleeper",
        message: "Couldn't load Sleeper's player list. Try again shortly.",
      });
      return {};
    });
  }

  const ctx = { userId, week, season, sleeperPlayers };
  const [events, results] = await Promise.all([
    fetchScoreboard(week, season, state.season_type).catch(() => {
      throw new HttpError(
        502,
        "Couldn't load this week's NFL games. Try again.",
      );
    }),
    Promise.allSettled(leagues.map((l) => loadLeague(l, ctx))),
  ]);
  const stateOf = teamGameStates(events);

  const matchups: Matchup[] = [];
  results.forEach((result, i) => {
    const league = leagues[i];
    if (!league) return;
    if (result.status === "rejected") {
      leagueErrors.push({
        league: leagueLabel(league),
        leagueSk: league.sk,
        message: problemMessage(result.reason),
      });
      return;
    }
    matchups.push(toMatchup(league.sk, league.platform, result.value, stateOf));
  });

  const rootFor: StakeMap = new Map();
  const rootAgainst: StakeMap = new Map();
  const byWeek = new Map<string, StakePlayer[]>();
  for (const m of matchups) {
    if (m.kind === "notStarted") continue;
    for (const s of m.me.starters) {
      addStake(s.gameState === "bye" ? byWeek : rootFor, s, m.league);
    }
    for (const s of m.opp?.starters ?? []) addStake(rootAgainst, s, m.league);
  }

  const games = events
    .map((ev) => {
      const game = toGame(ev);
      const teams = game.teams.map((t) => t.abbreviation);
      return {
        ...game,
        rootFor: stakesFor(rootFor, teams),
        rootAgainst: stakesFor(rootAgainst, teams),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    week,
    season,
    leaguesLinked: leagues.length,
    matchups,
    byePlayers: [...byWeek.values()].flat(),
    games,
    leagueErrors,
  };
}
