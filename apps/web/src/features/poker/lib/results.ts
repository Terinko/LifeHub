import type { Game } from "../types";
import { round2 } from "./money";

// Per-game facts the profile, leaderboard and record book all share.

export const finishedAt = (g: Game) => g.completedAt ?? g.date;

/** Oldest first, the order streaks and records are worked out in. */
export const chronological = (games: Game[]) =>
  [...games].sort(
    (a, b) =>
      new Date(finishedAt(a)).getTime() - new Date(finishedAt(b)).getTime(),
  );

export const netOf = (game: Game, id: string) =>
  round2(game.players?.[id]?.net ?? 0);

/** Money put on the table in one game, across every buy-in. */
export const moneyIn = (game: Game) =>
  round2(
    Object.values(game.players ?? {}).reduce((sum, s) => sum + s.buyIns, 0) *
      game.buyInAmount,
  );

/**
 * Where a player finished, 1 being the biggest winner. Tied results share
 * the better place, so two people up $20 both finish 1st.
 */
export function finishOf(game: Game, id: string): number {
  const mine = netOf(game, id);
  return (
    1 +
    Object.keys(game.players ?? {}).filter((other) => netOf(game, other) > mine)
      .length
  );
}

/** Won the night: finished 1st and actually came out ahead. */
export const wonNight = (game: Game, id: string) =>
  netOf(game, id) > 0 && finishOf(game, id) === 1;

/** Profit per dollar put in, as a whole percent. */
export const roiOf = (net: number, spent: number) =>
  spent > 0 ? Math.round((net / spent) * 100) : 0;
