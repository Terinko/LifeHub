import type { GameState, MatchupStatus, Starter } from "@lifehub/shared";
import { round1 } from "./types";

/** A starter still counts as "left to play" until their game is final. */
const isLeft = (state: GameState) => state === "pre" || state === "in";

/**
 * Where a matchup stands. Both sides' remaining starters are listed, so the
 * UI can say who still has to play instead of only the opponent's players.
 */
export function matchupStatus(
  myScore: number,
  oppScore: number,
  mine: Starter[],
  theirs: Starter[],
): MatchupStatus {
  const myLeft = mine.filter((s) => isLeft(s.gameState)).map((s) => s.name);
  const oppLeft = theirs.filter((s) => isLeft(s.gameState)).map((s) => s.name);
  const lead = round1(myScore - oppScore);

  const all = [...mine, ...theirs];
  const nobodyKickedOff =
    all.length > 0 &&
    all.every((s) => s.gameState === "pre" || s.gameState === "bye");
  if (nobodyKickedOff && myScore === 0 && oppScore === 0) {
    return { phase: "pregame", lead, myLeft, oppLeft };
  }
  const phase = myLeft.length === 0 && oppLeft.length === 0 ? "final" : "live";
  return { phase, lead, myLeft, oppLeft };
}
