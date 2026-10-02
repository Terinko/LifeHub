import type { Game } from "../types";
import { chronological, finishedAt, moneyIn, netOf } from "./results";

export type RecordKey =
  | "biggestGame"
  | "biggestWin"
  | "biggestLoss"
  | "mostBuyIns"
  | "longestStreak"
  | "biggestTable";

export type GroupRecord = {
  /** Who holds it; empty for records about the whole table. */
  name: string;
  value: number;
  /** The game it was set in (for a streak, the game it peaked in). */
  gameSk: string;
  date: string;
  buyIn: number;
};

export type RecordBook = Partial<Record<RecordKey, GroupRecord>>;

/**
 * The group's records. Games are walked oldest first and a record only
 * changes hands when it's beaten, so whoever set it first keeps a tie.
 */
export function recordBook(games: Game[]): RecordBook {
  const book: RecordBook = {};
  const streaks = new Map<string, number>();

  const offer = (
    key: RecordKey,
    value: number,
    game: Game,
    name = "",
    better = (a: number, b: number) => a > b,
  ) => {
    const held = book[key];
    if (held && !better(value, held.value)) return;
    book[key] = {
      name,
      value,
      gameSk: game.sk,
      date: finishedAt(game),
      buyIn: game.buyInAmount,
    };
  };

  for (const game of chronological(games)) {
    const seats = Object.entries(game.players ?? {});
    offer("biggestGame", moneyIn(game), game);
    offer("biggestTable", seats.length, game);
    for (const [id, seat] of seats) {
      const net = netOf(game, id);
      if (net > 0) offer("biggestWin", net, game, seat.name);
      if (net < 0) offer("biggestLoss", net, game, seat.name, (a, b) => a < b);
      offer("mostBuyIns", seat.buyIns, game, seat.name);
      const streak = net > 0 ? (streaks.get(id) ?? 0) + 1 : 0;
      streaks.set(id, streak);
      if (streak > 1) offer("longestStreak", streak, game, seat.name);
    }
  }
  return book;
}
