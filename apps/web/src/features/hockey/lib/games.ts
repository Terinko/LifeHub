import type { HockeyGame, HockeyGameSide } from "@lifehub/shared";

export const involves = (game: HockeyGame, teamId: string) =>
  game.home.id === teamId || game.away.id === teamId;

export const hasLiveGame = (games: HockeyGame[] | undefined) =>
  !!games?.some((g) => g.state === "in");

/** The team's side and its opponent's in a game. */
export function sides(game: HockeyGame, teamId: string) {
  const home = game.home.id === teamId;
  return {
    us: home ? game.home : game.away,
    them: home ? game.away : game.home,
    home,
  };
}

/** Live first, then upcoming, then finals; by start time within each. */
export function groupGames(games: HockeyGame[]) {
  return {
    live: games.filter((g) => g.state === "in"),
    upcoming: games.filter((g) => g.state === "pre"),
    final: games.filter((g) => g.state === "post"),
  };
}

/** "W 10–2", "L 1–3", "T 2–2" from the team's side, after the game. */
export function resultLabel(game: HockeyGame, teamId: string) {
  const { us, them } = sides(game, teamId);
  const a = us.score ?? 0;
  const b = them.score ?? 0;
  const letter = a > b ? "W" : a < b ? "L" : "T";
  const ot = /OT|SO/i.test(game.detail)
    ? ` ${game.detail.replace(/^Final\/?/i, "")}`
    : "";
  return `${letter} ${a}–${b}${ot}`;
}

/** Overtime and shootout periods are labelled "OT", "2OT", "SO". */
export const periodLabel = (index: number) =>
  index < 3 ? String(index + 1) : index === 3 ? "OT" : `${index - 2}OT`;

export const sideLabel = (side: HockeyGameSide) =>
  side.rank ? `${side.rank} ${side.name}` : side.name;
