import { PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  quantile,
  type ThriftCalibration,
  type ThriftItemType,
} from "@lifehub/shared";
import { isConditionalCheckFailed } from "../shared/conditionalCheck";
import { db } from "../shared/db";
import { requireEnv } from "../shared/env";
import { HttpError } from "../shared/http";

const table = () => requireEnv("TABLE_NAME");

/** Lookups one person can run per day (eBay allows 5,000 calls a day in all). */
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

// Calibration is shared by everyone who uses Thrift: each saved check makes
// the estimate better for the whole group. It holds numbers people typed in,
// never eBay listing data.
const calPk = (itemType: ThriftItemType) => `CAL#${itemType}`;

export async function saveSale(
  userId: string,
  sale: {
    itemType: ThriftItemType;
    query: string;
    ceiling: number;
    sold: number;
  },
  now = new Date(),
) {
  await db.send(
    new PutCommand({
      TableName: table(),
      Item: {
        pk: calPk(sale.itemType),
        sk: `${now.toISOString()}#${userId}`,
        query: sale.query,
        ceiling: sale.ceiling,
        sold: sale.sold,
        ratio: sale.sold / sale.ceiling,
      },
    }),
  );
}

/** The median sold ÷ asking ratio for this kind of item, or null with no checks. */
export async function getCalibration(
  itemType: ThriftItemType,
): Promise<ThriftCalibration | null> {
  const res = await db.send(
    new QueryCommand({
      TableName: table(),
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": calPk(itemType) },
      ProjectionExpression: "ratio",
    }),
  );
  const ratios = (res.Items ?? [])
    .map((item) => Number(item.ratio))
    .filter((r) => Number.isFinite(r) && r > 0);
  const median = quantile(ratios, 0.5);
  return median === null ? null : { ratio: median, checks: ratios.length };
}
