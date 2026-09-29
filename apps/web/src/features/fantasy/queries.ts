import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LinkedLeague, UpdateLeagueInput } from "@lifehub/shared";
import {
  findSleeperLeagues,
  getBoxScore,
  getGuide,
  linkLeague,
  listLeagues,
  unlinkLeague,
  updateLeague,
} from "./api";
import { hasLiveGames } from "./lib/games";

export const fantasyKeys = {
  guide: ["fantasy", "guide"] as const,
  leagues: ["fantasy", "leagues"] as const,
  sleeper: (username: string) => ["fantasy", "sleeper", username] as const,
  boxScore: (gameId: string) => ["fantasy", "boxScore", gameId] as const,
};

const LIVE_REFRESH_MS = 30_000;
const IDLE_REFRESH_MS = 5 * 60_000;

/**
 * This week's guide. Refreshes every 30 seconds while a game is live and
 * every few minutes otherwise, plus whenever the app comes back to the
 * foreground (TanStack Query's refetch on focus).
 */
export function useGuide() {
  return useQuery({
    queryKey: fantasyKeys.guide,
    queryFn: getGuide,
    refetchInterval: (query) =>
      hasLiveGames(query.state.data) ? LIVE_REFRESH_MS : IDLE_REFRESH_MS,
  });
}

export function useLeagues() {
  return useQuery({ queryKey: fantasyKeys.leagues, queryFn: listLeagues });
}

export function useSleeperLeagues(username: string) {
  return useQuery({
    queryKey: fantasyKeys.sleeper(username),
    queryFn: () => findSleeperLeagues(username),
    enabled: username.length > 0,
    retry: false,
  });
}

/** Stats for an opened game; live games keep refreshing. */
export function useBoxScore(gameId: string, live: boolean) {
  return useQuery({
    queryKey: fantasyKeys.boxScore(gameId),
    queryFn: () => getBoxScore(gameId),
    refetchInterval: live ? LIVE_REFRESH_MS : false,
  });
}

/** Any change to leagues changes the guide too. */
function useLeagueMutation<TVars>(
  mutationFn: (vars: TVars) => Promise<unknown>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: fantasyKeys.leagues }),
        qc.invalidateQueries({ queryKey: fantasyKeys.guide }),
      ]),
  });
}

export const useLinkLeague = () => useLeagueMutation(linkLeague);

export const useUpdateLeague = () =>
  useLeagueMutation(({ sk, input }: { sk: string; input: UpdateLeagueInput }) =>
    updateLeague(sk, input),
  );

export function useUnlinkLeague() {
  const qc = useQueryClient();
  const mutation = useLeagueMutation(unlinkLeague);
  return {
    ...mutation,
    /** Removes the row right away; it comes back if the server refuses. */
    unlink: (sk: string) => {
      const previous = qc.getQueryData<LinkedLeague[]>(fantasyKeys.leagues);
      qc.setQueryData<LinkedLeague[]>(fantasyKeys.leagues, (list = []) =>
        list.filter((l) => l.sk !== sk),
      );
      mutation.mutate(sk, {
        onError: () => qc.setQueryData(fantasyKeys.leagues, previous),
      });
    },
  };
}
