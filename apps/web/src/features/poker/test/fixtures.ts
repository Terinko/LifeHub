import type { Game, Player, Seat } from "../types";

export const player = (id: string, name: string, userId?: string): Player => ({
  pk: "POKER#GROUP",
  sk: `PLAYER#${id}`,
  name,
  ...(userId ? { userId } : {}),
});

export const seat = (
  name: string,
  buyIns = 1,
  extra: Partial<Seat> = {},
): Seat => ({
  name,
  buyIns,
  finalChips: null,
  ...extra,
});

export function game(
  id: string,
  seats: Record<string, Seat>,
  extra: Partial<Game> = {},
): Game {
  return {
    pk: "POKER#GROUP",
    sk: `GAME#${id}`,
    status: "ACTIVE",
    buyInAmount: 10,
    chipsPerBuyIn: 1000,
    players: seats,
    date: "2026-09-26T23:00:00.000Z",
    ...extra,
  };
}

/** A settled game where each seat is [name, buy-ins, net]. */
export function done(
  id: string,
  completedAt: string,
  seats: Record<string, [string, number, number]>,
  extra: Partial<Game> = {},
): Game {
  return game(
    id,
    Object.fromEntries(
      Object.entries(seats).map(([pid, [name, buyIns, net]]) => [
        pid,
        seat(name, buyIns, { net, finalChips: 0 }),
      ]),
    ),
    { status: "COMPLETED", completedAt, date: completedAt, ...extra },
  );
}
