// Shapes of the items in the Poker table. Everything lives under one
// partition ("POKER#GROUP"): roster entries (sk "PLAYER#...") and games
// (sk "GAME#..."). Items are stored as the screen sent them, so any field
// may be missing on older data.

/** A player's seat in one game. `net` is added when the game is settled. */
export type Seat = {
  name: string;
  buyIns: number;
  finalChips?: number | null;
  net?: number;
  /** Set when the player left early with their chips counted. */
  cashedOutAt?: string;
  [key: string]: unknown;
};

export type Settlement = {
  from: string;
  fromId: string;
  to: string;
  toId: string;
  amount: number;
};

export type PokerItem = { pk: string; sk: string; [key: string]: unknown };

export type Player = PokerItem & { name?: string; userId?: string };

export type Game = PokerItem & {
  status?: string;
  buyInAmount?: unknown;
  chipsPerBuyIn?: unknown;
  /** Seats keyed by the player's roster sk. */
  players?: Record<string, Seat>;
  settlements?: Settlement[];
  countsForStats?: unknown;
};
