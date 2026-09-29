import { UpstreamError } from "../../shared/fetchJson";
import { decryptCookies, type EncryptedCookies } from "../crypto";
import { getEspnLeague, teamPageUrl } from "../espn/api";
import { espnWeek } from "../espn/week";
import * as repo from "../repository";
import type { StoredLeague } from "../repository";
import { getLeagueUsers, getMatchups, getRosters } from "../sleeper/api";
import { currentSleeperLeague } from "../sleeper/currentLeague";
import type { PlayerMap } from "../sleeper/players";
import { sleeperWeek } from "../sleeper/week";
import { LeagueError, type LeagueWeek } from "./types";

export type LoadedLeague = { label: string; url: string; week: LeagueWeek };

type Context = {
  userId: string;
  week: number;
  season: string;
  sleeperPlayers: PlayerMap;
};

export function leagueLabel(league: StoredLeague): string {
  if (league.nickname) return league.nickname;
  if (league.leagueName) return league.leagueName;
  const platform = league.platform === "SLEEPER" ? "Sleeper" : "ESPN";
  return `${platform} league ${league.leagueId.slice(-4)}`;
}

async function loadSleeper(
  stored: StoredLeague,
  ctx: Context,
): Promise<LoadedLeague> {
  const league = await currentSleeperLeague(ctx.userId, stored, ctx.season);
  const [users, rosters, matchups] = await Promise.all([
    getLeagueUsers(league.leagueId),
    getRosters(league.leagueId),
    getMatchups(league.leagueId, ctx.week),
  ]);
  return {
    label: leagueLabel(league),
    url: `https://sleeper.com/leagues/${league.leagueId}`,
    week: sleeperWeek({
      userId: league.sleeperUserId ?? "",
      users,
      rosters,
      matchups,
      players: ctx.sleeperPlayers,
    }),
  };
}

/** Turns an ESPN HTTP failure into a message the user can act on. */
export function espnFailure(error: unknown, season: string): Error {
  if (!(error instanceof UpstreamError)) return error as Error;
  if (error.status === 401 || error.status === 403) {
    return new LeagueError(
      "ESPN says this league is private, so it needs your espn_s2 and SWID cookies.",
    );
  }
  if (error.status === 404) {
    return new LeagueError(`ESPN has no ${season} season for this league yet.`);
  }
  return new LeagueError(
    `ESPN didn't answer (HTTP ${error.status}). Try again shortly.`,
  );
}

async function loadEspn(
  league: StoredLeague,
  ctx: Context,
): Promise<LoadedLeague> {
  const cookies = league.espnCookieCipher
    ? decryptCookies(league as EncryptedCookies)
    : undefined;
  // ESPN keeps a league's id across seasons, so always read the current one.
  const data = await getEspnLeague(league.leagueId, ctx.season, cookies).catch(
    (error: unknown) => {
      throw espnFailure(error, ctx.season);
    },
  );
  const leagueName = data.settings?.name ?? null;
  if (leagueName && leagueName !== league.leagueName) {
    await repo
      .updateLeague(ctx.userId, league.sk, { leagueName, season: ctx.season })
      .catch((error: unknown) =>
        console.error(`Failed to update ${league.sk}:`, error),
      );
  }
  const teamId = league.espnTeamId ?? "";
  return {
    label: leagueLabel({ ...league, leagueName }),
    url: teamPageUrl(league.leagueId, teamId, ctx.season),
    week: espnWeek(data, teamId, ctx.week),
  };
}

export const loadLeague = (league: StoredLeague, ctx: Context) =>
  league.platform === "SLEEPER"
    ? loadSleeper(league, ctx)
    : loadEspn(league, ctx);
