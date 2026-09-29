import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAdmin, useProfile } from "../../shared/hooks/useProfile";
import {
  addPlayer,
  claimPlayer,
  deleteItem,
  endGame,
  getGroupStats,
  getMyStats,
  getPoker,
  renamePlayer,
  startGame,
  unclaimPlayer,
  updateBuyIn,
  updateFinalChips,
} from "./api";
import type { Game, Player } from "./types";

export const pokerKeys = {
  all: ["poker"] as const,
  items: ["poker", "items"] as const,
  mine: ["poker", "mine"] as const,
  group: ["poker", "group"] as const,
};

/** Roster and games. Refreshes every 20s so a shared table stays in sync. */
export function usePokerItems() {
  return useQuery({
    queryKey: pokerKeys.items,
    queryFn: getPoker,
    refetchInterval: 20_000,
  });
}

export function useMyStats() {
  return useQuery({ queryKey: pokerKeys.mine, queryFn: getMyStats });
}

/** Whether this user can see the shared Hall of Fame. */
export function useHasGroupStats() {
  const profile = useProfile();
  return (
    isAdmin(profile.data) || profile.data?.permissions?.pokerStats === true
  );
}

export function useGroupStats(enabled: boolean) {
  return useQuery({
    queryKey: pokerKeys.group,
    queryFn: getGroupStats,
    enabled,
  });
}

/** Any Poker change can touch the roster, games and stats. */
function usePokerMutation<TVars, TResult = unknown>(
  mutationFn: (vars: TVars) => Promise<TResult>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => qc.invalidateQueries({ queryKey: pokerKeys.all }),
  });
}

export const useAddPlayer = () => usePokerMutation(addPlayer);

export const useRenamePlayer = () =>
  usePokerMutation(({ id, name }: { id: string; name: string }) =>
    renamePlayer(id, name),
  );

export const useClaimPlayer = () =>
  usePokerMutation((id: string | null) =>
    id ? claimPlayer(id) : unclaimPlayer(),
  );

export const useDeleteItem = () => usePokerMutation(deleteItem);

export const useStartGame = () => usePokerMutation(startGame);

/**
 * Settling removes the game from the running list. The refresh isn't
 * awaited, so the payouts open before the settle sheet's game disappears.
 */
export function useEndGame() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: endGame,
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: pokerKeys.all });
    },
  });
}

export const useSaveChips = () =>
  usePokerMutation(
    ({ sk, id, chips }: { sk: string; id: string; chips: number | null }) =>
      updateFinalChips(sk, id, chips),
  );

type BuyIn = { game: Game; playerId: string; delta: 1 | -1 };

/**
 * Adds or removes a buy-in right away on screen. If the server refuses,
 * the screen goes back to what it had.
 */
export function useBuyIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ game, playerId, delta }: BuyIn) =>
      updateBuyIn(game.sk, playerId, delta),
    onMutate: async ({ game, playerId, delta }: BuyIn) => {
      await qc.cancelQueries({ queryKey: pokerKeys.items });
      const previous = qc.getQueryData<(Player | Game)[]>(pokerKeys.items);
      qc.setQueryData<(Player | Game)[]>(pokerKeys.items, (items = []) =>
        items.map((item) => {
          if (item.sk !== game.sk) return item;
          const g = item as Game;
          const seat = g.players[playerId];
          if (!seat) return g;
          return {
            ...g,
            players: {
              ...g.players,
              [playerId]: { ...seat, buyIns: Math.max(1, seat.buyIns + delta) },
            },
          };
        }),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(pokerKeys.items, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: pokerKeys.items }),
  });
}
