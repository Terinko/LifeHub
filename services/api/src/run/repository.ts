import {
  BatchWriteCommand,
  type BatchWriteCommandInput,
  type BatchWriteCommandOutput,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { RunActivity, RunVo2Reading } from "@lifehub/shared";
import { db } from "../shared/db";
import { requireEnv } from "../shared/env";
import type { GarminTokens } from "./garmin/oauth";

// Every DynamoDB call for the Run tool. Each user's runs, VO2 max readings
// and Garmin tokens live under their own Cognito id; GARMIN#<id> maps a
// webhook's Garmin user back to them.

const table = () => requireEnv("TABLE_NAME");

const userPk = (userId: string) => `USER#${userId}`;
const runsPk = (userId: string) => `USER#${userId}#RUN`;
const vo2Pk = (userId: string) => `USER#${userId}#VO2`;
const garminPk = (garminUserId: string) => `GARMIN#${garminUserId}`;

/** A user's Garmin connection. The tokens never leave the backend. */
export type GarminLink = GarminTokens & {
  garminUserId: string;
  connectedAt: string;
  syncedAt?: string;
};

export async function getLink(userId: string): Promise<GarminLink | undefined> {
  const res = await db.send(
    new GetCommand({
      TableName: table(),
      Key: { pk: userPk(userId), sk: "GARMIN" },
    }),
  );
  return res.Item as GarminLink | undefined;
}

export async function putLink(userId: string, link: GarminLink) {
  await db.send(
    new PutCommand({
      TableName: table(),
      Item: { pk: userPk(userId), sk: "GARMIN", ...link },
    }),
  );
  await db.send(
    new PutCommand({
      TableName: table(),
      Item: { pk: garminPk(link.garminUserId), sk: "USER", userId },
    }),
  );
}

export async function saveTokens(userId: string, tokens: GarminTokens) {
  await db.send(
    new UpdateCommand({
      TableName: table(),
      Key: { pk: userPk(userId), sk: "GARMIN" },
      UpdateExpression:
        "SET accessToken = :a, refreshToken = :r, expiresAt = :e",
      ExpressionAttributeValues: {
        ":a": tokens.accessToken,
        ":r": tokens.refreshToken,
        ":e": tokens.expiresAt,
      },
    }),
  );
}

export async function markSynced(userId: string, at: string) {
  await db.send(
    new UpdateCommand({
      TableName: table(),
      Key: { pk: userPk(userId), sk: "GARMIN" },
      UpdateExpression: "SET syncedAt = :t",
      ConditionExpression: "attribute_exists(pk)",
      ExpressionAttributeValues: { ":t": at },
    }),
  );
}

/** The LifeHub user a Garmin account is connected to, if any. */
export async function userForGarmin(garminUserId: string) {
  const res = await db.send(
    new GetCommand({
      TableName: table(),
      Key: { pk: garminPk(garminUserId), sk: "USER" },
    }),
  );
  return (res.Item as { userId: string } | undefined)?.userId;
}

export async function savePkce(
  userId: string,
  state: string,
  verifier: string,
) {
  await db.send(
    new PutCommand({
      TableName: table(),
      Item: {
        pk: userPk(userId),
        sk: `PKCE#${state}`,
        verifier,
        createdAt: new Date().toISOString(),
      },
    }),
  );
}

/** Reads and deletes a sign-in attempt, so each state works once. */
export async function takePkce(userId: string, state: string) {
  const res = await db.send(
    new DeleteCommand({
      TableName: table(),
      Key: { pk: userPk(userId), sk: `PKCE#${state}` },
      ReturnValues: "ALL_OLD",
    }),
  );
  return res.Attributes as { verifier: string; createdAt: string } | undefined;
}

export async function putRun(userId: string, run: RunActivity) {
  await db.send(
    new PutCommand({
      TableName: table(),
      Item: { pk: runsPk(userId), sk: `${run.start}#${run.id}`, ...run },
    }),
  );
}

export async function putVo2(userId: string, reading: RunVo2Reading) {
  await db.send(
    new PutCommand({
      TableName: table(),
      Item: { pk: vo2Pk(userId), sk: reading.date, ...reading },
    }),
  );
}

/** Every item under a partition from `fromSk` on, following DynamoDB's pages. */
async function queryAll(pk: string, fromSk = "") {
  const items: Record<string, unknown>[] = [];
  let start: Record<string, unknown> | undefined;
  do {
    const res = await db.send(
      new QueryCommand({
        TableName: table(),
        KeyConditionExpression: "pk = :pk AND sk >= :from",
        ExpressionAttributeValues: { ":pk": pk, ":from": fromSk },
        ExclusiveStartKey: start,
      }),
    );
    items.push(...(res.Items ?? []));
    start = res.LastEvaluatedKey;
  } while (start);
  return items;
}

export async function listRuns(userId: string, from: string) {
  const items = await queryAll(runsPk(userId), from);
  return items.map(
    ({ id, start, name, distanceM, durationS, avgHr, elevGainM }) =>
      ({
        id,
        start,
        name,
        distanceM,
        durationS,
        avgHr,
        elevGainM,
      }) as RunActivity,
  );
}

export async function listVo2(userId: string, from: string) {
  const items = await queryAll(vo2Pk(userId), from);
  return items.map(({ date, value }) => ({ date, value }) as RunVo2Reading);
}

async function deleteAll(pk: string) {
  const items = await queryAll(pk);
  for (let i = 0; i < items.length; i += 25) {
    let requests: BatchWriteCommandInput["RequestItems"] = {
      [table()]: items.slice(i, i + 25).map(({ pk, sk }) => ({
        DeleteRequest: { Key: { pk, sk } },
      })),
    };
    // DynamoDB can hand back part of a batch when busy; send that part again.
    while (requests && Object.keys(requests).length > 0) {
      const res: BatchWriteCommandOutput = await db.send(
        new BatchWriteCommand({ RequestItems: requests }),
      );
      requests = res.UnprocessedItems;
    }
  }
}

/** Forgets the connection and every run and reading it brought in. */
export async function deleteGarminData(userId: string, garminUserId: string) {
  await deleteAll(runsPk(userId));
  await deleteAll(vo2Pk(userId));
  await db.send(
    new DeleteCommand({
      TableName: table(),
      Key: { pk: garminPk(garminUserId), sk: "USER" },
    }),
  );
  await db.send(
    new DeleteCommand({
      TableName: table(),
      Key: { pk: userPk(userId), sk: "GARMIN" },
    }),
  );
}
