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
import { isConditionalCheckFailed } from "../shared/conditionalCheck";

// Every DynamoDB call for the Run tool. The Garmin Personal API key reads one
// person's data, so one LifeHub user owns it (CONFIG/GARMIN); their runs and
// VO2 max readings are copied here so the page loads without calling Garmin.

const table = () => requireEnv("TABLE_NAME");

const runsPk = (userId: string) => `USER#${userId}#RUN`;
const vo2Pk = (userId: string) => `USER#${userId}#VO2`;
const OWNER_KEY = { pk: "CONFIG", sk: "GARMIN" };

/** Who the Garmin key belongs to, and the last time their runs were copied. */
export type GarminOwner = {
  userId: string;
  connectedAt: string;
  /** ISO time of the last successful sync. */
  syncedAt?: string;
};

export async function getOwner(): Promise<GarminOwner | undefined> {
  const res = await db.send(
    new GetCommand({ TableName: table(), Key: OWNER_KEY }),
  );
  if (!res.Item) return undefined;
  const { userId, connectedAt, syncedAt } = res.Item as GarminOwner;
  return { userId, connectedAt, syncedAt };
}

/** Makes `userId` the key's owner, unless someone already is. Returns false if taken. */
export async function claimOwner(userId: string, at: string): Promise<boolean> {
  try {
    await db.send(
      new PutCommand({
        TableName: table(),
        Item: { ...OWNER_KEY, userId, connectedAt: at },
        ConditionExpression: "attribute_not_exists(pk) OR userId = :me",
        ExpressionAttributeValues: { ":me": userId },
      }),
    );
    return true;
  } catch (error) {
    if (isConditionalCheckFailed(error)) return false;
    throw error;
  }
}

export async function markSynced(at: string) {
  await db.send(
    new UpdateCommand({
      TableName: table(),
      Key: OWNER_KEY,
      UpdateExpression: "SET syncedAt = :t",
      ConditionExpression: "attribute_exists(pk)",
      ExpressionAttributeValues: { ":t": at },
    }),
  );
}

export async function putRuns(userId: string, runs: RunActivity[]) {
  await writeBatches(
    runs.map((run) => ({
      PutRequest: {
        Item: { pk: runsPk(userId), sk: `${run.start}#${run.id}`, ...run },
      },
    })),
  );
}

export async function putVo2s(userId: string, readings: RunVo2Reading[]) {
  await writeBatches(
    readings.map((reading) => ({
      PutRequest: {
        Item: { pk: vo2Pk(userId), sk: reading.date, ...reading },
      },
    })),
  );
}

type WriteRequest = NonNullable<
  BatchWriteCommandInput["RequestItems"]
>[string][number];

/** Writes in DynamoDB's batches of 25, resending whatever it hands back. */
async function writeBatches(writes: WriteRequest[]) {
  for (let i = 0; i < writes.length; i += 25) {
    let requests: BatchWriteCommandInput["RequestItems"] = {
      [table()]: writes.slice(i, i + 25),
    };
    while (requests && Object.keys(requests).length > 0) {
      const res: BatchWriteCommandOutput = await db.send(
        new BatchWriteCommand({ RequestItems: requests }),
      );
      requests = res.UnprocessedItems;
    }
  }
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
  await writeBatches(
    items.map(({ pk, sk }) => ({ DeleteRequest: { Key: { pk, sk } } })),
  );
}

/** Forgets the owner and every run and reading copied from Garmin. */
export async function deleteGarminData(userId: string) {
  await deleteAll(runsPk(userId));
  await deleteAll(vo2Pk(userId));
  await db.send(new DeleteCommand({ TableName: table(), Key: OWNER_KEY }));
}
