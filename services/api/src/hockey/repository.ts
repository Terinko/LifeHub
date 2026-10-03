import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { HockeyPollSnapshot } from "@lifehub/shared";
import { isConditionalCheckFailed } from "../shared/conditionalCheck";
import { db } from "../shared/db";
import { requireEnv } from "../shared/env";

// The poll site only shows this week's poll, so each new one is kept here to
// draw a team's rank across the season. Shared by everyone: it's public data.
const POLL_PK = "POLL#USCHO";

const table = () => requireEnv("TABLE_NAME");

/** Saves this poll once; later sightings of the same week are no-ops. */
export async function savePollSnapshot(snapshot: HockeyPollSnapshot) {
  try {
    await db.send(
      new PutCommand({
        TableName: table(),
        Item: { pk: POLL_PK, sk: snapshot.through, ...snapshot },
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
  } catch (error) {
    if (!isConditionalCheckFailed(error)) throw error;
  }
}

export async function listPollSnapshots(): Promise<HockeyPollSnapshot[]> {
  const res = await db.send(
    new QueryCommand({
      TableName: table(),
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": POLL_PK },
    }),
  );
  return ((res.Items ?? []) as HockeyPollSnapshot[])
    .map(({ through, seenAt, rows }) => ({ through, seenAt, rows }))
    .sort((a, b) => a.seenAt.localeCompare(b.seenAt));
}
