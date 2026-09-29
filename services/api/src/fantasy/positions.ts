import type { Position } from "@lifehub/shared";

const KNOWN: Record<string, Position> = {
  QB: "QB",
  RB: "RB",
  WR: "WR",
  TE: "TE",
  K: "K",
  DEF: "DEF",
  "D/ST": "DEF",
  DST: "DEF",
};

export const toPosition = (raw: string | null | undefined): Position =>
  (raw && KNOWN[raw.toUpperCase()]) || "OTHER";

// Sleeper and ESPN spell a couple of team codes differently from the NFL
// scoreboard; everything is normalized to the scoreboard's codes.
const TEAM_ALIASES: Record<string, string> = { WAS: "WSH", JAC: "JAX" };

export const normTeam = (abbr: string) => TEAM_ALIASES[abbr] ?? abbr;
