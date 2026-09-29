/** A roster entry. `userId` is set when someone has claimed them as "me". */
export type Player = {
  pk: string;
  sk: string;
  name: string;
  userId?: string;
};

/** A player's seat in one game. `net` exists once the game is settled. */
export type Seat = {
  name: string;
  buyIns: number;
  finalChips: number | null;
  net?: number;
};

export type Settlement = {
  from: string;
  fromId: string;
  to: string;
  toId: string;
  amount: number;
};

export type Game = {
  pk: string;
  sk: string;
  status: "ACTIVE" | "COMPLETED";
  buyInAmount: number;
  chipsPerBuyIn: number;
  /** Seats keyed by the player's roster sk. */
  players: Record<string, Seat>;
  date: string;
  completedAt?: string;
  settlements?: Settlement[];
  countsForStats?: boolean;
};

/** GET /poker/mystats: the players I've claimed and their completed games. */
export type MyStatsData = {
  playerIds: string[];
  games: Game[];
};

export type StartGameInput = {
  buyInAmount: number;
  chipsPerBuyIn: number;
  players: Record<string, Seat>;
};

export type EndGameInput = {
  sk: string;
  finalChips: Record<string, number>;
  saveToHistory: boolean;
  includeInStats: boolean;
};

/** What END_GAME returns: nets and payouts, whether or not it was saved. */
export type EndGameResult = {
  saved: boolean;
  settlements: Settlement[];
  players?: Record<string, Seat>;
};
