import type { FantasyGuide, NflGame } from "@lifehub/shared";

export const hasStake = (game: NflGame) =>
  game.rootFor.length > 0 || game.rootAgainst.length > 0;

/**
 * Games you have players in, live ones first, then upcoming, then finished
 * (kept apart so they can collapse); games with no stake go last.
 */
export function groupGames(games: NflGame[]) {
  const stakes = games.filter(hasStake);
  return {
    live: stakes.filter((g) => g.state === "in"),
    upcoming: stakes.filter((g) => g.state === "pre"),
    finished: stakes.filter((g) => g.state === "post"),
    other: games.filter((g) => !hasStake(g)),
  };
}

export const hasLiveGames = (guide: FantasyGuide | undefined) =>
  !!guide?.games.some((g) => g.state === "in");

export const formatKickoff = (iso: string) =>
  new Date(iso).toLocaleString([], {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });

/** "3rd 4:12 · NBC", "Sun 1:00 PM · FOX", "Final". */
export function gameMeta(game: NflGame) {
  const when = game.state === "pre" ? formatKickoff(game.date) : game.detail;
  return game.broadcast && game.state !== "post"
    ? `${when} · ${game.broadcast}`
    : when;
}

export const gamecastUrl = (game: NflGame) =>
  `https://www.espn.com/nfl/game/_/gameId/${game.id}`;
