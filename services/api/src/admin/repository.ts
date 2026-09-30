import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { db } from "../shared/db";
import { requireEnv } from "../shared/env";

// Every DynamoDB call for the admin page lives here. Its TABLE_NAME is the
// users table.

const table = () => requireEnv("TABLE_NAME");

/** A user profile as stored (pk "USER#<cognito sub>"). */
export type AdminUser = Record<string, unknown> & {
  pk: string;
  email?: string;
  role?: string;
  permissions?: Record<string, unknown>;
  lastSeenChangelogAt?: string;
};

export const userKey = (sub: string) => `USER#${sub}`;

export async function getUser(pk: unknown): Promise<AdminUser | undefined> {
  const res = await db.send(
    new GetCommand({ TableName: table(), Key: { pk } }),
  );
  return res.Item as AdminUser | undefined;
}

export async function listUsers(): Promise<AdminUser[]> {
  const res = await db.send(new ScanCommand({ TableName: table() }));
  return (res.Items ?? []) as AdminUser[];
}

export async function putUser(user: AdminUser): Promise<void> {
  await db.send(new PutCommand({ TableName: table(), Item: user }));
}

export async function deleteUser(pk: unknown): Promise<void> {
  await db.send(new DeleteCommand({ TableName: table(), Key: { pk } }));
}

/**
 * Stamps lastActiveAt, and backfills lastSeenChangelogAt only when it's
 * missing so the "What's New" popup has a real baseline.
 */
export async function touchLastActive(pk: string, now: string): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: table(),
      Key: { pk },
      UpdateExpression:
        "SET lastActiveAt = :now, lastSeenChangelogAt = if_not_exists(lastSeenChangelogAt, :now)",
      ExpressionAttributeValues: { ":now": now },
    }),
  );
}

export async function markChangelogSeen(
  pk: string,
  now: string,
): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: table(),
      Key: { pk },
      UpdateExpression: "SET lastSeenChangelogAt = :now",
      ExpressionAttributeValues: { ":now": now },
    }),
  );
}
