import type { StakePlayer } from "@lifehub/shared";

export const formatPoints = (n: number | null | undefined) =>
  n == null ? "–" : n.toFixed(1);

/**
 * A player you have in several leagues can score differently in each
 * (different scoring rules). One number when they agree, otherwise the
 * points go next to each league's name.
 */
export function stakePoints(player: StakePlayer): {
  points: string | null;
  leagues: string;
} {
  const values = new Set(player.leagues.map((l) => formatPoints(l.points)));
  const [only] = values;
  if (values.size === 1 && only !== undefined) {
    return {
      points: only,
      leagues: player.leagues.map((l) => l.league).join(" · "),
    };
  }
  return {
    points: null,
    leagues: player.leagues
      .map((l) => `${l.league} ${formatPoints(l.points)}`)
      .join(" · "),
  };
}
