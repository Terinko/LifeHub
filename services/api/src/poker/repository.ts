import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { db } from "../shared/db";
import { requireEnv } from "../shared/env";
import type { Game, PokerItem, Settlement } from "./types";

// Every DynamoDB call for the Poker tool lives here. The whole group
// shares one partition.

const table = () => requireEnv("TABLE_NAME");

export const GROUP_PK = "POKER#GROUP";

const key = (sk: string) => ({ pk: GROUP_PK, sk });

/** Conditions a write on the game still being ACTIVE. */
const STILL_ACTIVE = {
  ConditionExpression: "#status = :active",
  ExpressionAttributeNames: { "#status": "status" },
  ExpressionAttributeValues: { ":active": "ACTIVE" },
};

export async function listGroup(): Promise<PokerItem[]> {
  const res = await db.send(
    new QueryCommand({
      TableName: table(),
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": GROUP_PK },
    }),
  );
  return (res.Items ?? []) as PokerItem[];
}

export async function listGames(): Promise<Game[]> {
  const res = await db.send(
    new QueryCommand({
      TableName: table(),
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :game)",
      ExpressionAttributeValues: { ":pk": GROUP_PK, ":game": "GAME#" },
    }),
  );
  return (res.Items ?? []) as Game[];
}

export async function getGame(sk: string): Promise<Game | undefined> {
  const res = await db.send(
    new GetCommand({ TableName: table(), Key: key(sk) }),
  );
  return res.Item as Game | undefined;
}

/** Upsert. With onlyIfActive, fails unless the stored game is still ACTIVE. */
export async function putItem(
  item: PokerItem,
  onlyIfActive = false,
): Promise<void> {
  await db.send(
    new PutCommand({
      TableName: table(),
      Item: item,
      ...(onlyIfActive ? STILL_ACTIVE : {}),
    }),
  );
}

/** With onlyIfActive, fails unless the stored game is still ACTIVE. */
export async function deleteItem(
  sk: string,
  onlyIfActive = false,
): Promise<void> {
  await db.send(
    new DeleteCommand({
      TableName: table(),
      Key: key(sk),
      ...(onlyIfActive ? STILL_ACTIVE : {}),
    }),
  );
}

async function update(
  sk: string,
  UpdateExpression: string,
  names?: Record<string, string>,
  values?: Record<string, unknown>,
  condition?: string,
): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: table(),
      Key: key(sk),
      UpdateExpression,
      ...(condition && { ConditionExpression: condition }),
      ...(names && { ExpressionAttributeNames: names }),
      ...(values && { ExpressionAttributeValues: values }),
    }),
  );
}

/** A single-field update, so the player's claimed userId is kept. */
export const setPlayerName = (playerId: string, name: string) =>
  update(playerId, "SET #name = :name", { "#name": "name" }, { ":name": name });

/** Renames the player's seat in a game, and its payments when given. */
export const setSeatName = (
  gameSk: string,
  playerId: string,
  name: string,
  settlements?: Settlement[],
) =>
  settlements
    ? update(
        gameSk,
        "SET players.#pid.#name = :name, settlements = :settlements",
        { "#pid": playerId, "#name": "name" },
        { ":name": name, ":settlements": settlements },
      )
    : update(
        gameSk,
        "SET players.#pid.#name = :name",
        { "#pid": playerId, "#name": "name" },
        { ":name": name },
      );

export const setClaim = (playerId: string, userId: string) =>
  update(playerId, "SET userId = :uid", undefined, { ":uid": userId });

export const removeClaim = (playerId: string) =>
  update(playerId, "REMOVE userId");

/**
 * Atomic +1/-1 on one player's buy-ins, so two people adjusting buy-ins at
 * once can't clobber each other. A decrement never goes below 1.
 */
export const bumpBuyIns = (gameSk: string, playerId: string, delta: 1 | -1) =>
  update(
    gameSk,
    "SET players.#pid.buyIns = players.#pid.buyIns + :delta",
    { "#pid": playerId },
    // DynamoDB rejects values the expressions don't use, so :floor is
    // only sent on the decrement path.
    delta < 0 ? { ":delta": delta, ":floor": 1 } : { ":delta": delta },
    // Someone who has cashed out can't buy back in until they're undone.
    delta < 0
      ? "players.#pid.buyIns > :floor"
      : "attribute_exists(players.#pid.buyIns) AND attribute_not_exists(players.#pid.cashedOutAt)",
  );

/** Only while the game is running and the player is seated at it. */
export const setFinalChips = (
  gameSk: string,
  playerId: string,
  chips: number | null,
) =>
  update(
    gameSk,
    "SET players.#pid.finalChips = :chips",
    { "#pid": playerId, "#status": "status" },
    { ":chips": chips, ":active": "ACTIVE" },
    "#status = :active AND attribute_exists(players.#pid)",
  );

/**
 * Locks in a player who leaves early: their chip count and when they left.
 * Only while the game is running and they're seated at it.
 */
export const setCashOut = (
  gameSk: string,
  playerId: string,
  chips: number,
  at: string,
) =>
  update(
    gameSk,
    "SET players.#pid.finalChips = :chips, players.#pid.cashedOutAt = :at",
    { "#pid": playerId, "#status": "status" },
    { ":chips": chips, ":at": at, ":active": "ACTIVE" },
    "#status = :active AND attribute_exists(players.#pid)",
  );

/** Puts a cashed-out player back at the table with their count cleared. */
export const clearCashOut = (gameSk: string, playerId: string) =>
  update(
    gameSk,
    "SET players.#pid.finalChips = :none REMOVE players.#pid.cashedOutAt",
    { "#pid": playerId, "#status": "status" },
    { ":none": null, ":active": "ACTIVE" },
    "#status = :active AND attribute_exists(players.#pid)",
  );

/** Sets or clears a game's note. Fails if the game is gone. */
export const setNotes = (gameSk: string, notes: string) =>
  notes
    ? update(
        gameSk,
        "SET notes = :notes",
        undefined,
        { ":notes": notes },
        "attribute_exists(sk)",
      )
    : update(
        gameSk,
        "REMOVE notes",
        undefined,
        undefined,
        "attribute_exists(sk)",
      );
