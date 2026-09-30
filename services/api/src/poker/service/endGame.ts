import { isConditionalCheckFailed } from "../../shared/conditionalCheck";
import { badRequest, HttpError } from "../../shared/http";
import * as repo from "../repository";
import { calculateSettlements, chipTotals, isPositiveNumber } from "../settle";
import type { Game, Seat } from "../types";

type EndGameBody = {
  game?: { sk?: string };
  finalChips?: Record<string, unknown>;
  saveToHistory?: boolean;
  includeInStats?: boolean;
};

const alreadySettled = () =>
  new HttpError(409, "This game was just settled by someone else.");

/**
 * The chip counts typed into the settle screen come with the request: each
 * box also saves on its own, but that save can still be in flight when
 * Calculate is tapped. A count this device doesn't have (null) keeps
 * whatever is saved, which may have come from someone else.
 */
export function applyClientChips(
  seats: Record<string, Seat>,
  clientChips: Record<string, unknown>,
): Record<string, Seat> {
  const players: Record<string, Seat> = {};
  for (const [id, p] of Object.entries(seats)) {
    const sent = clientChips[id];
    if (sent === null || sent === undefined) {
      players[id] = p;
      continue;
    }
    const chips = Number(sent);
    if (!Number.isFinite(chips) || chips < 0) {
      throw badRequest(`${p.name}'s final chips must be 0 or more`);
    }
    players[id] = { ...p, finalChips: chips };
  }
  return players;
}

/** Throws unless the chips counted match the chips bought in. */
export function checkChipsAddUp(
  players: Record<string, Seat>,
  chipsPerBuyIn: number,
) {
  const { expected, counted } = chipTotals(players, chipsPerBuyIn);
  if (counted === expected) return;
  const fmt = (n: number) => n.toLocaleString("en-US");
  const diff = fmt(Math.abs(expected - counted));
  throw badRequest(
    `The chips don't add up: ${fmt(counted)} counted but ${fmt(expected)} were bought in (${diff} ${counted < expected ? "missing" : "extra"}). Recount before settling.`,
  );
}

/** Reads the game fresh (buy-ins may have changed since the page loaded). */
async function loadActiveGame(
  sk: string,
): Promise<Game & { buyInAmount: number; chipsPerBuyIn: number }> {
  const game = await repo.getGame(sk);
  if (!game || game.status !== "ACTIVE") {
    throw new HttpError(
      409,
      "This game isn't active anymore. It may have already been settled.",
    );
  }
  if (
    !isPositiveNumber(game.buyInAmount) ||
    !isPositiveNumber(game.chipsPerBuyIn)
  ) {
    throw badRequest(
      "This game has no buy-in amount or chips per buy-in, so it can't be settled.",
    );
  }
  return game as Game & { buyInAmount: number; chipsPerBuyIn: number };
}

/**
 * Settles a game. Both writes only go through while the game is still
 * active, so a double tap or two people settling at once can't record it
 * twice or delete a game someone else just saved.
 */
export async function endGame(
  userId: string,
  canCountForStats: boolean,
  body: EndGameBody,
) {
  const {
    game: clientGame,
    finalChips: clientChips = {},
    saveToHistory = true,
    includeInStats = true,
  } = body;
  if (!clientGame?.sk) throw badRequest("Missing game reference");

  const game = await loadActiveGame(clientGame.sk);
  const players = applyClientChips(game.players || {}, clientChips);
  checkChipsAddUp(players, game.chipsPerBuyIn);
  const result = calculateSettlements(
    players,
    game.buyInAmount,
    game.chipsPerBuyIn,
  );

  if (!saveToHistory) {
    // Still clear the active game so the group can start a new one.
    try {
      await repo.deleteItem(game.sk, true);
    } catch (error) {
      if (!isConditionalCheckFailed(error)) throw error;
      throw alreadySettled();
    }
    return {
      players: result.players,
      settlements: result.settlements,
      saved: false,
    };
  }

  const completedGame = {
    ...game,
    pk: repo.GROUP_PK,
    sk: game.sk,
    status: "COMPLETED",
    players: result.players,
    settlements: result.settlements,
    countsForStats: canCountForStats ? includeInStats : false,
    recordedBy: userId,
    completedAt: new Date().toISOString(),
  };
  try {
    await repo.putItem(completedGame, true);
  } catch (error) {
    if (!isConditionalCheckFailed(error)) throw error;
    throw alreadySettled();
  }
  return { ...completedGame, saved: true };
}
