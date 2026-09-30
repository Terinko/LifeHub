import { DeleteCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { db } from "../shared/db";
import { requireEnv } from "../shared/env";

// Every DynamoDB call for the Bills tool lives here.

/**
 * A bill is stored as whatever the screen sent (after validateBill) plus
 * its keys. Older items may carry id or billId instead of sk.
 */
export type BillItem = Record<string, unknown> & {
  pk: string;
  sk?: unknown;
  id?: unknown;
  billId?: unknown;
};

const table = () => requireEnv("TABLE_NAME");

export const partitionKey = (userId: string) => `USER#${userId}#BILL`;

export async function listBills(userId: string): Promise<BillItem[]> {
  const res = await db.send(
    new QueryCommand({
      TableName: table(),
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": partitionKey(userId) },
    }),
  );
  return (res.Items ?? []) as BillItem[];
}

export async function putBill(item: BillItem): Promise<void> {
  await db.send(new PutCommand({ TableName: table(), Item: item }));
}

export async function deleteBill(userId: string, sk: string): Promise<void> {
  await db.send(
    new DeleteCommand({
      TableName: table(),
      Key: { pk: partitionKey(userId), sk },
    }),
  );
}
