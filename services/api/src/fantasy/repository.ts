import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { FantasyPlatform } from "@lifehub/shared";
import { db } from "../shared/db";
import { requireEnv } from "../shared/env";
import type { EncryptedCookies } from "./crypto";

// Every DynamoDB call for the Fantasy tool lives here.

const table = () => requireEnv("TABLE_NAME");

export const partitionKey = (userId: string) => `USER#${userId}`;

export const leagueSortKey = (platform: FantasyPlatform, leagueId: string) =>
  `LEAGUE#${platform}#${leagueId}`;

/**
 * A linked league as stored. Items written before the rewrite have no
 * leagueName and, for Sleeper, no season; the guide fills them in.
 */
export type StoredLeague = {
  pk: string;
  sk: string;
  platform: FantasyPlatform;
  leagueId: string;
  nickname: string | null;
  leagueName?: string | null;
  season?: string | null;
  sleeperUsername?: string;
  sleeperUserId?: string;
  espnTeamId?: string;
  linkedAt: string;
} & Partial<EncryptedCookies>;

export async function listLeagues(userId: string): Promise<StoredLeague[]> {
  const res = await db.send(
    new QueryCommand({
      TableName: table(),
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": partitionKey(userId),
        ":prefix": "LEAGUE#",
      },
    }),
  );
  return (res.Items ?? []) as StoredLeague[];
}

export async function getLeague(
  userId: string,
  sk: string,
): Promise<StoredLeague | undefined> {
  const res = await db.send(
    new GetCommand({
      TableName: table(),
      Key: { pk: partitionKey(userId), sk },
    }),
  );
  return res.Item as StoredLeague | undefined;
}

export async function putLeague(item: StoredLeague): Promise<void> {
  await db.send(new PutCommand({ TableName: table(), Item: item }));
}

/** Sets the given fields on an existing league (never creates one). */
export async function updateLeague(
  userId: string,
  sk: string,
  fields: Partial<Omit<StoredLeague, "pk" | "sk">>,
): Promise<StoredLeague> {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
  const res = await db.send(
    new UpdateCommand({
      TableName: table(),
      Key: { pk: partitionKey(userId), sk },
      UpdateExpression: `SET ${entries.map((_, i) => `#f${i} = :v${i}`).join(", ")}`,
      ExpressionAttributeNames: Object.fromEntries(
        entries.map(([name], i) => [`#f${i}`, name]),
      ),
      ExpressionAttributeValues: Object.fromEntries(
        entries.map(([, value], i) => [`:v${i}`, value]),
      ),
      ConditionExpression: "attribute_exists(sk)",
      ReturnValues: "ALL_NEW",
    }),
  );
  return res.Attributes as StoredLeague;
}

export async function deleteLeague(userId: string, sk: string): Promise<void> {
  await db.send(
    new DeleteCommand({
      TableName: table(),
      Key: { pk: partitionKey(userId), sk },
    }),
  );
}

// --- Sleeper player list cache (one shared item) ---------------------------

const PLAYER_CACHE_KEY = { pk: "CACHE#SLEEPER_PLAYERS", sk: "META" };

export type PlayerCacheItem<T> = { fetchedAt: string; players: T };

export async function getPlayerCache<T>(): Promise<
  PlayerCacheItem<T> | undefined
> {
  const res = await db.send(
    new GetCommand({ TableName: table(), Key: PLAYER_CACHE_KEY }),
  );
  return res.Item as PlayerCacheItem<T> | undefined;
}

export async function putPlayerCache<T>(item: PlayerCacheItem<T>) {
  await db.send(
    new PutCommand({
      TableName: table(),
      Item: { ...PLAYER_CACHE_KEY, ...item },
    }),
  );
}
