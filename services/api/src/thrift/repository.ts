import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { isConditionalCheckFailed } from "../shared/conditionalCheck";
import { db } from "../shared/db";
import { requireEnv } from "../shared/env";
import { HttpError } from "../shared/http";

const table = () => requireEnv("TABLE_NAME");

/** Lookups one person can run per day, to keep traffic to Poshmark light. */
export const DAILY_LOOKUPS = 60;

/**
 * Counts a lookup against the caller's daily allowance (UTC day), or throws
 * a 429 once it's used up.
 */
export async function takeLookup(userId: string, now = new Date()) {
  try {
    await db.send(
      new UpdateCommand({
        TableName: table(),
        Key: { pk: `LIMIT#${userId}`, sk: now.toISOString().slice(0, 10) },
        UpdateExpression: "ADD #count :one",
        ConditionExpression: "attribute_not_exists(#count) OR #count < :max",
        ExpressionAttributeNames: { "#count": "count" },
        ExpressionAttributeValues: { ":one": 1, ":max": DAILY_LOOKUPS },
      }),
    );
  } catch (error) {
    if (isConditionalCheckFailed(error)) {
      throw new HttpError(
        429,
        `That's all ${DAILY_LOOKUPS} of today's lookups. Try again tomorrow.`,
      );
    }
    throw error;
  }
}
