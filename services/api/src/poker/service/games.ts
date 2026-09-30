import { randomUUID } from "node:crypto";
import { isConditionalCheckFailed } from "../../shared/conditionalCheck";
import { badRequest, HttpError } from "../../shared/http";
import * as repo from "../repository";
import { isPositiveNumber } from "../settle";
import type { PokerItem, Seat } from "../types";
import { busyPlayerNames } from "../views";

type Body = Record<string, unknown>;

export async function updateBuyIn({ gameSk, playerId, delta }: Body) {
  if (!gameSk || !playerId || (delta !== 1 && delta !== -1)) {
    throw badRequest("gameSk, playerId and delta (+1/-1) required");
  }
  try {
    await repo.bumpBuyIns(gameSk as string, playerId as string, delta);
  } catch (error) {
    if (!isConditionalCheckFailed(error)) throw error;
    // Already at the floor (or the game or player vanished): a no-op.
  }
  return { updated: true };
}

export async function updateFinalChips({ gameSk, playerId, finalChips }: Body) {
  if (!gameSk || !playerId) throw badRequest("gameSk and playerId required");
  const chips =
    finalChips === null || finalChips === undefined ? null : Number(finalChips);
  if (chips !== null && !(Number.isFinite(chips) && chips >= 0)) {
    throw badRequest("Final chips must be 0 or more");
  }
  try {
    // A settled game's nets were worked out from the chips it had then.
    await repo.setFinalChips(gameSk as string, playerId as string, chips);
  } catch (error) {
    if (!isConditionalCheckFailed(error)) throw error;
    throw new HttpError(409, "That game isn't active anymore.");
  }
  return { updated: true };
}

/** Checks a new game (pk "GAME", no sk) before it's created. */
async function checkNewGame(body: Body) {
  const seats = (body.players || {}) as Record<string, Seat | undefined>;
  const playerIds = Object.keys(seats);
  if (
    !isPositiveNumber(body.buyInAmount) ||
    !isPositiveNumber(body.chipsPerBuyIn)
  ) {
    throw badRequest("Buy-in and chips per buy-in must both be more than 0.");
  }
  if (playerIds.length < 2)
    throw badRequest("A game needs at least 2 players.");

  // Someone can only sit at one table at a time.
  const busy = busyPlayerNames(playerIds, seats, await repo.listGames());
  if (busy.length > 0) {
    throw new HttpError(
      409,
      `${busy.join(", ")} ${busy.length === 1 ? "is" : "are"} already in another active game.`,
    );
  }
}

/**
 * Creates or replaces a roster entry or game as sent. New items get a
 * "PLAYER#" or "GAME#" sk; everything shares the group partition.
 */
export async function saveItem(body: Body): Promise<PokerItem> {
  if (body.pk === "GAME" && !body.sk) await checkNewGame(body);

  const prefix = body.pk === "GAME" ? "GAME#" : "PLAYER#";
  const item: PokerItem = {
    ...body,
    pk: repo.GROUP_PK,
    sk: (body.sk as string) || `${prefix}${randomUUID()}`,
  };
  await repo.putItem(item);
  return item;
}
