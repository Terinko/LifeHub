import type { Game, Player, Seat } from "../types";
import { round2 } from "./money";

export const isPlayer = (item: Player | Game): item is Player =>
  item.sk?.startsWith("PLAYER#") ?? false;

export const isGame = (item: Player | Game): item is Game =>
  item.sk?.startsWith("GAME#") ?? false;

const finishedAt = (g: Game) => g.completedAt ?? g.date;
const newestFirst = (a: Game, b: Game) =>
  new Date(finishedAt(b)).getTime() - new Date(finishedAt(a)).getTime();

/** Splits GET /poker into the roster, running games and history. */
export function splitItems(items: (Player | Game)[]) {
  const players = items
    .filter(isPlayer)
    .sort((a, b) => a.name.localeCompare(b.name));
  const games = items.filter(isGame);
  return {
    players,
    activeGames: games
      .filter((g) => g.status === "ACTIVE")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    pastGames: games.filter((g) => g.status === "COMPLETED").sort(newestFirst),
  };
}

/** Everyone sitting at a running table; they can't join another one. */
export const seatedIds = (activeGames: Game[]) =>
  new Set(activeGames.flatMap((g) => Object.keys(g.players ?? {})));

/** Seats in the order they're shown: by name. */
export const seatsOf = (game: Game): [string, Seat][] =>
  Object.entries(game.players ?? {}).sort(([, a], [, b]) =>
    a.name.localeCompare(b.name),
  );

/** Seats still at the table, then the people who cashed out early. */
export function tableOf(game: Game) {
  const seats = seatsOf(game);
  return {
    playing: seats.filter(([, s]) => !s.cashedOutAt),
    cashedOut: seats.filter(([, s]) => s.cashedOutAt),
  };
}

export function potOf(game: Game) {
  const buyIns = Object.values(game.players ?? {}).reduce(
    (sum, s) => sum + s.buyIns,
    0,
  );
  return {
    buyIns,
    dollars: round2(buyIns * game.buyInAmount),
    chips: buyIns * game.chipsPerBuyIn,
  };
}

/** What a chip count is worth against what the player paid in. */
export const previewNet = (seat: Seat, game: Game, chips: number | null) =>
  round2(
    ((chips ?? 0) / game.chipsPerBuyIn) * game.buyInAmount -
      seat.buyIns * game.buyInAmount,
  );

/**
 * Chips handed out versus chips counted. A blank count is 0 chips, the same
 * as the server treats it.
 */
export function chipCheck(game: Game, counts: Record<string, number | null>) {
  const expected = potOf(game).chips;
  const counted = Object.keys(game.players ?? {}).reduce(
    (sum, id) => sum + (counts[id] ?? 0),
    0,
  );
  return { expected, counted, balanced: counted === expected };
}

export type Setup = { buyIn: number; chips: number; playerIds: string[] };

/** The stakes and players of the most recent game, to start the next one. */
export function lastSetup(games: Game[]): Setup | null {
  const latest = [...games].sort(newestFirst)[0];
  if (!latest) return null;
  return {
    buyIn: latest.buyInAmount,
    chips: latest.chipsPerBuyIn,
    playerIds: Object.keys(latest.players ?? {}),
  };
}

/** "Tyler" → "TY", "Jordan Park" → "JP" */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0];
  const last = words[words.length - 1];
  if (!first || !last) return "?";
  if (words.length === 1) return first.slice(0, 2).toUpperCase();
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

const CHIPS = [
  "red",
  "blue",
  "green",
  "black",
  "purple",
  "orange",
  "teal",
  "pink",
] as const;
export type ChipColor = (typeof CHIPS)[number];

/** A stable chip color per player, so people are easy to spot. */
export function chipColor(id: string): ChipColor {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return CHIPS[hash % CHIPS.length] ?? "red";
}

/** "Started 1h 42m ago" style age. */
export function gameAge(date: string, now = Date.now()): string {
  const mins = Math.max(
    0,
    Math.floor((now - new Date(date).getTime()) / 60000),
  );
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  return `${Math.floor(hours / 24)}d`;
}

export const isStale = (date: string, now = Date.now()) =>
  now - new Date(date).getTime() > 24 * 60 * 60 * 1000;

/** My result in a finished game, when one of my claimed players sat in it. */
export function myNet(game: Game, myIds: string[]): number | null {
  const seat = Object.entries(game.players ?? {}).find(([id]) =>
    myIds.includes(id),
  )?.[1];
  return seat ? (seat.net ?? 0) : null;
}

/** Everyone's result in a finished game, biggest winner first. */
export const resultsOf = (game: Game) =>
  Object.entries(game.players ?? {})
    .map(([id, seat]) => ({ id, ...seat, net: seat.net ?? 0 }))
    .sort((a, b) => b.net - a.net || a.name.localeCompare(b.name));
