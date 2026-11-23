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
import type {
  HrvReading,
  LiftSession,
  LiftSet,
  RunActivity,
  RunBestEfforts,
  RunVo2Reading,
} from "@lifehub/shared";
import { db } from "../shared/db";
import { requireEnv } from "../shared/env";
import { isConditionalCheckFailed } from "../shared/conditionalCheck";

// Every DynamoDB call for the Run tool. The Garmin Personal API key reads one
// person's data, so one LifeHub user owns it (CONFIG/GARMIN); their runs and
// VO2 max readings are copied here so the page loads without calling Garmin.

const table = () => requireEnv("TABLE_NAME");

const runsPk = (userId: string) => `USER#${userId}#RUN`;
const vo2Pk = (userId: string) => `USER#${userId}#VO2`;
const liftsPk = (userId: string) => `USER#${userId}#LIFT`;
const hrvPk = (userId: string) => `USER#${userId}#HRV`;
const detailPk = (userId: string) => `USER#${userId}#DETAIL`;
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

export async function putLifts(userId: string, lifts: LiftSession[]) {
  await writeBatches(
    lifts.map((lift) => ({
      PutRequest: {
        Item: { pk: liftsPk(userId), sk: `${lift.start}#${lift.id}`, ...lift },
      },
    })),
  );
}

export async function putHrv(userId: string, readings: HrvReading[]) {
  await writeBatches(
    readings.map((reading) => ({
      PutRequest: {
        Item: { pk: hrvPk(userId), sk: reading.date, ...reading },
      },
    })),
  );
}

/**
 * What was read from one activity's own detail, stored apart from the
 * activity so re-syncing the activity list never erases it. `found` is false
 * when Garmin had nothing to read, so it isn't asked again.
 */
export type ActivityDetail = {
  id: string;
  found: boolean;
  sets?: LiftSet[];
  driftPct?: number;
  bestEfforts?: RunBestEfforts;
};

export async function putDetail(userId: string, detail: ActivityDetail) {
  await db.send(
    new PutCommand({
      TableName: table(),
      Item: { pk: detailPk(userId), sk: detail.id, ...detail },
    }),
  );
}

export async function listDetails(
  userId: string,
): Promise<Map<string, ActivityDetail>> {
  const items = await queryAll(detailPk(userId));
  return new Map(
    items.map((item) => {
      const { id, found, sets, driftPct, bestEfforts } = item as ActivityDetail;
      return [id, { id, found, sets, driftPct, bestEfforts }];
    }),
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

/** An item without its table keys. */
function withoutKeys(item: Record<string, unknown>) {
  const rest = { ...item };
  delete rest.pk;
  delete rest.sk;
  return rest;
}

export async function listRuns(userId: string, from: string) {
  const items = await queryAll(runsPk(userId), from);
  return items.map((item) => withoutKeys(item) as RunActivity);
}

export async function listLifts(userId: string, from: string) {
  const items = await queryAll(liftsPk(userId), from);
  return items.map((item) => withoutKeys(item) as LiftSession);
}

export async function listHrv(userId: string, from: string) {
  const items = await queryAll(hrvPk(userId), from);
  return items.map(({ date, value }) => ({ date, value }) as HrvReading);
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

/** Forgets the owner and everything copied from Garmin. */
export async function deleteGarminData(userId: string) {
  await deleteAll(runsPk(userId));
  await deleteAll(vo2Pk(userId));
  await deleteAll(liftsPk(userId));
  await deleteAll(hrvPk(userId));
  await deleteAll(detailPk(userId));
  await db.send(new DeleteCommand({ TableName: table(), Key: OWNER_KEY }));
}
