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

// A small shared history: Tyler and Sam twice, then Tyler and Alex.
export const g1 = done(
  "1",
  "2026-08-01T03:00:00Z",
  { "PLAYER#me": ["Tyler", 1, 20], "PLAYER#s": ["Sam", 3, -20] },
  {
    settlements: [
      {
        from: "Sam",
        fromId: "PLAYER#s",
        to: "Tyler",
        toId: "PLAYER#me",
        amount: 20,
      },
    ],
  },
);
export const g2 = done(
  "2",
  "2026-09-01T03:00:00Z",
  { "PLAYER#me": ["Tyler", 2, -5], "PLAYER#s": ["Sam", 2, 5] },
  {
    settlements: [
      {
        from: "Tyler",
        fromId: "PLAYER#me",
        to: "Sam",
        toId: "PLAYER#s",
        amount: 5,
      },
    ],
  },
);
export const g3 = done("3", "2026-09-08T03:00:00Z", {
  "PLAYER#me": ["Tyler", 1, 10],
  "PLAYER#a": ["Alex", 4, -10],
});
