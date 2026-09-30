import {
  BatchWriteCommand,
  DeleteCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { KitchenItem, KitchenType } from "@lifehub/shared";
import { db } from "../shared/db";
import { requireEnv } from "../shared/env";

// Every DynamoDB call for Kitchen lives here. Items are stored under
// "USER#<id>#<TYPE>" and handed to the app with pk set to just the type.

const table = () => requireEnv("TABLE_NAME");

export const partitionKey = (userId: string, type: KitchenType) =>
  `USER#${userId}#${type}`;

export async function listType<T extends KitchenItem>(
  userId: string,
  type: KitchenType,
): Promise<T[]> {
  const res = await db.send(
    new QueryCommand({
      TableName: table(),
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": partitionKey(userId, type) },
      ConsistentRead: true,
    }),
  );
  return (res.Items ?? []).map((item) => ({ ...item, pk: type }) as T);
}

export async function putItem(userId: string, item: KitchenItem) {
  await db.send(
    new PutCommand({
      TableName: table(),
      Item: { ...item, pk: partitionKey(userId, item.pk) },
    }),
  );
}

export async function deleteItem(
  userId: string,
  type: KitchenType,
  sk: string,
) {
  await db.send(
    new DeleteCommand({
      TableName: table(),
      Key: { pk: partitionKey(userId, type), sk },
    }),
  );
}

type Write = { put: KitchenItem } | { remove: { pk: KitchenType; sk: string } };

/** Applies many puts and deletes, 25 per request (DynamoDB's limit). */
export async function writeAll(userId: string, writes: Write[]) {
  for (let i = 0; i < writes.length; i += 25) {
    const requests = writes.slice(i, i + 25).map((w) =>
      "put" in w
        ? {
            PutRequest: {
              Item: { ...w.put, pk: partitionKey(userId, w.put.pk) },
            },
          }
        : {
            DeleteRequest: {
              Key: { pk: partitionKey(userId, w.remove.pk), sk: w.remove.sk },
            },
          },
    );
    let pending: typeof requests | undefined = requests;
    for (let attempt = 0; pending?.length && attempt < 5; attempt++) {
      const res = await db.send(
        new BatchWriteCommand({ RequestItems: { [table()]: pending } }),
      );
      pending = res.UnprocessedItems?.[table()] as typeof requests | undefined;
    }
    if (pending?.length) throw new Error("Kitchen couldn't save every change");
  }
}
