import { GetCommand } from "@aws-sdk/lib-dynamodb";
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
