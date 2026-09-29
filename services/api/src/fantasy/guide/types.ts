import type { Position } from "@lifehub/shared";

/** A starter before the NFL scoreboard says where their game stands. */
export type RawStarter = {
  name: string;
  pos: Position;
  team: string;
  points: number | null;
};

export type RawSide = {
  name: string;
  record: string;
  score: number;
  starters: RawStarter[];
};

/** One league's week, as read from Sleeper or ESPN. */
export type LeagueWeek = {
  kind: "matchup" | "bye" | "notStarted";
  me: RawSide;
  opp: RawSide | null;
};

/** A problem with one league that shouldn't take down the whole guide. */
export class LeagueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeagueError";
  }
}

export const round1 = (n: number) => Math.round(n * 10) / 10;

export function recordString(wins = 0, losses = 0, ties = 0) {
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}
