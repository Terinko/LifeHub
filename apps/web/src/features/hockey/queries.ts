import { useQueries, useQuery } from "@tanstack/react-query";
import {
  HOCKEY_CONFERENCES,
  type HockeyConference,
  type HockeyGame,
} from "@lifehub/shared";
import {
  getBoxScore,
  getNpi,
  getPoll,
  getScores,
  getStats,
  getStandings,
  getTeamSchedule,
  getTeams,
} from "./api";
import { easternDate, todayKey } from "./lib/dates";
import { hasLiveGame } from "./lib/games";

export const hockeyKeys = {
  scores: (date: string) => ["hockey", "scores", date] as const,
  poll: ["hockey", "poll"] as const,
  npi: ["hockey", "npi"] as const,
  standings: (c: HockeyConference) => ["hockey", "standings", c] as const,
  teams: ["hockey", "teams"] as const,
  team: (id: string) => ["hockey", "team", id] as const,
  box: (id: string) => ["hockey", "box", id] as const,
  stats: ["hockey", "stats"] as const,
};

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const LIVE_REFRESH = 30 * SECOND;

/** A day's games; every 30 seconds while any is live, else every 5 minutes today. */
export function useScores(date: string) {
  return useQuery({
    queryKey: hockeyKeys.scores(date),
    queryFn: () => getScores(date),
    refetchInterval: (query) =>
      hasLiveGame(query.state.data?.games)
        ? LIVE_REFRESH
        : date === todayKey()
          ? 5 * MINUTE
          : false,
  });
}

export const usePoll = () =>
  useQuery({
    queryKey: hockeyKeys.poll,
    queryFn: getPoll,
    staleTime: 30 * MINUTE,
  });

export const useNpi = () =>
  useQuery({
    queryKey: hockeyKeys.npi,
    queryFn: getNpi,
    staleTime: 10 * MINUTE,
  });

export const useStandings = (conference: HockeyConference | undefined) =>
  useQuery({
    queryKey: hockeyKeys.standings(conference ?? "ecac"),
    queryFn: () => getStandings(conference ?? "ecac"),
    enabled: !!conference,
    staleTime: 10 * MINUTE,
  });

export const useTeams = (enabled = true) =>
  useQuery({
    queryKey: hockeyKeys.teams,
    queryFn: getTeams,
    enabled,
    staleTime: 6 * 60 * MINUTE,
  });

export const useTeamSchedule = (id: string, enabled = true) =>
  useQuery({
    queryKey: hockeyKeys.team(id),
    queryFn: () => getTeamSchedule(id),
    enabled: enabled && !!id,
    refetchInterval: (query) =>
      hasLiveGame(query.state.data?.games) ? LIVE_REFRESH : 5 * MINUTE,
  });

/** Goals and goalies, where the school publishes them; live games refresh. */
export const useBoxScore = (game: HockeyGame) =>
  useQuery({
    queryKey: hockeyKeys.box(game.id),
    queryFn: () =>
      getBoxScore(easternDate(game.start), [game.away.id, game.home.id]),
    enabled: game.state !== "pre",
    refetchInterval: game.state === "in" ? LIVE_REFRESH : false,
  });

/** Quinnipiac's season stats (the only school whose stats we can read). */
export const useStats = (enabled: boolean) =>
  useQuery({
    queryKey: hockeyKeys.stats,
    queryFn: getStats,
    enabled,
    staleTime: 10 * MINUTE,
  });

/** Every conference's standings at once, for the tournament projection. */
export const useAllStandings = () =>
  useQueries({
    queries: HOCKEY_CONFERENCES.map((conference) => ({
      queryKey: hockeyKeys.standings(conference),
      queryFn: () => getStandings(conference),
      staleTime: 10 * MINUTE,
    })),
  });
