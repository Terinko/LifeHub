import type { Game } from "../types";
import { formatShortMoney, formatShortSigned } from "./money";
import { playerProfile, type Rival } from "./profile";
import { recordBook, type GroupRecord } from "./records";
import { finishedAt, moneyIn } from "./results";
import { leaderboard, type LeaderRow } from "./stats";

/** Fewer games than this and a year isn't worth a Wrapped. */
export const WRAPPED_MIN_GAMES = 3;

const yearOf = (g: Game) => new Date(finishedAt(g)).getFullYear();

/** Years with enough games for a Wrapped, newest first. */
export function wrappedYears(games: Game[]): number[] {
  const counts = new Map<number, number>();
  for (const g of games)
    counts.set(yearOf(g), (counts.get(yearOf(g)) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, n]) => n >= WRAPPED_MIN_GAMES)
    .map(([y]) => y)
    .sort((a, b) => b - a);
}

export type MyYear = {
  name: string;
  net: number;
  games: number;
  winRate: number;
  nightsWon: number;
  /** Place on the year's leaderboard, 1 being best. */
  rank: number;
  bestNight: GroupRecord | null;
  nemesis: Rival | null;
  favoriteAtm: Rival | null;
};

export type Wrapped = {
  year: number;
  games: number;
  onTable: number;
  players: number;
  busiestMonth: { month: string; games: number } | null;
  mvp: LeaderRow | null;
  mostNightsWon: LeaderRow | null;
  ironMan: LeaderRow | null;
  biggestGame: GroupRecord | null;
  biggestWin: GroupRecord | null;
  me: MyYear | null;
};

function bestNightOf(games: Game[], id: string): GroupRecord | null {
  let best: GroupRecord | null = null;
  for (const g of games) {
    const seat = g.players?.[id];
    const net = seat?.net ?? 0;
    if (seat && net > 0 && (!best || net > best.value))
      best = {
        name: seat.name,
        value: net,
        gameSk: g.sk,
        date: finishedAt(g),
        buyIn: g.buyInAmount,
      };
  }
  return best;
}

/** One year of poker, for the group and (when given) for me. */
export function wrappedFor(
  allGames: Game[],
  year: number,
  myId?: string,
): Wrapped {
  const games = allGames.filter((g) => yearOf(g) === year);
  const board = leaderboard(games);
  const records = recordBook(games);
  const months = new Map<string, number>();
  for (const g of games) {
    const month = new Date(finishedAt(g)).toLocaleDateString("en-US", {
      month: "long",
    });
    months.set(month, (months.get(month) ?? 0) + 1);
  }
  const busiest = [...months.entries()].sort((a, b) => b[1] - a[1])[0];
  const top = (key: "nightsWon" | "games") =>
    [...board].sort((a, b) => b[key] - a[key] || b.net - a.net)[0] ?? null;

  const profile = myId ? playerProfile(games, myId) : null;
  const rank = board.findIndex((r) => r.id === myId) + 1;

  return {
    year,
    games: games.length,
    onTable: games.reduce((sum, g) => sum + moneyIn(g), 0),
    players: board.length,
    busiestMonth: busiest ? { month: busiest[0], games: busiest[1] } : null,
    mvp: board[0] ?? null,
    mostNightsWon: top("nightsWon"),
    ironMan: top("games"),
    biggestGame: records.biggestGame ?? null,
    biggestWin: records.biggestWin ?? null,
    me:
      profile && myId
        ? {
            name: profile.name,
            net: profile.net,
            games: profile.games,
            winRate: profile.winRate,
            nightsWon: profile.nightsWon,
            rank,
            bestNight: bestNightOf(games, myId),
            nemesis: profile.nemesis,
            favoriteAtm: profile.favoriteAtm,
          }
        : null,
  };
}

/** The year as a few lines for the group chat. */
export function wrappedText(w: Wrapped): string {
  return [
    `Poker Wrapped ${w.year}`,
    `${w.games} games · ${formatShortMoney(w.onTable)} on the table · ${w.players} players`,
    ...(w.mvp ? [`MVP: ${w.mvp.name} (${formatShortSigned(w.mvp.net)})`] : []),
    ...(w.mostNightsWon && w.mostNightsWon.nightsWon > 0
      ? [
          `Most nights won: ${w.mostNightsWon.name} (${w.mostNightsWon.nightsWon})`,
        ]
      : []),
    ...(w.biggestWin
      ? [
          `Biggest win: ${w.biggestWin.name} ${formatShortSigned(w.biggestWin.value)}`,
        ]
      : []),
  ].join("\n");
}
