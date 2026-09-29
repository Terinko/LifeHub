import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { db } from "./db";
import { requireEnv } from "./env";

export type UserProfile = {
  pk: string;
  email?: string;
  role?: "ADMIN" | "USER";
  permissions?: Partial<Record<string, boolean>>;
};

export async function getProfile(
  userId: string,
): Promise<UserProfile | undefined> {
  const res = await db.send(
    new GetCommand({
      TableName: requireEnv("USERS_TABLE"),
      Key: { pk: `USER#${userId}` },
    }),
  );
  return res.Item as UserProfile | undefined;
}

export const isAdmin = (profile: UserProfile | undefined) =>
  profile?.role === "ADMIN";

/** Admins can use every tool; everyone else needs the tool's permission. */
export const hasPermission = (
  profile: UserProfile | undefined,
  permission: string,
) => isAdmin(profile) || profile?.permissions?.[permission] === true;

/**
 * Stamps e.g. lastUsedFantasy on the caller's profile for the admin page.
 * Best effort: a failure is logged and never fails the request.
 */
export async function recordToolUse(
  userId: string,
  attribute: string,
): Promise<void> {
  try {
    await db.send(
      new UpdateCommand({
        TableName: requireEnv("USERS_TABLE"),
        Key: { pk: `USER#${userId}` },
        UpdateExpression: "SET #attr = :now",
        ExpressionAttributeNames: { "#attr": attribute },
        ExpressionAttributeValues: { ":now": new Date().toISOString() },
      }),
    );
  } catch (error) {
    console.error(`Failed to record ${attribute}:`, error);
  }
}
