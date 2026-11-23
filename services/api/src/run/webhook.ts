import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { isGarminCallback } from "./garmin/api";
import { getGarminApp } from "./garmin/app";
import { garminFetch } from "./garmin/http";
import {
  isRun,
  toRunActivity,
  toVo2Reading,
  type GarminActivity,
  type GarminUserMetrics,
} from "./garmin/summaries";
import * as repo from "./repository";
import { accessTokenFor } from "./service";

// POST /run/garmin/webhook: Garmin's servers send new activities and VO2 max
// readings here (Push), or a link to fetch them from (Ping). There's no
// Cognito token, so it only accepts requests naming LifeHub's Garmin app,
// and only stores data for Garmin accounts someone has connected.

type Item = { userId?: string; callbackURL?: string };
type Notification = {
  activities?: (GarminActivity & Item)[];
  userMetrics?: (GarminUserMetrics & Item)[];
  deregistrations?: Item[];
};

const reply = (statusCode: number): APIGatewayProxyStructuredResultV2 => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: "{}",
});

function readBody(event: APIGatewayProxyEventV2): Notification {
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body ?? "", "base64").toString("utf8")
    : (event.body ?? "");
  try {
    return JSON.parse(raw) as Notification;
  } catch {
    return {};
  }
}

/** For a Ping: fetch the summaries Garmin is pointing at, with the user's token. */
async function fetchPinged<T>(userId: string, url: string): Promise<T[]> {
  const link = await repo.getLink(userId);
  if (!link || !isGarminCallback(url)) return [];
  return garminFetch<T[]>(url, await accessTokenFor(userId, link));
}

async function summariesFor<T extends Item>(
  userId: string,
  item: T,
): Promise<T[]> {
  return item.callbackURL ? fetchPinged<T>(userId, item.callbackURL) : [item];
}

async function handleActivity(userId: string, item: GarminActivity & Item) {
  for (const activity of await summariesFor(userId, item)) {
    if (isRun(activity)) await repo.putRun(userId, toRunActivity(activity));
  }
}

async function handleMetrics(userId: string, item: GarminUserMetrics & Item) {
  for (const metrics of await summariesFor(userId, item)) {
    const reading = toVo2Reading(metrics);
    if (reading) await repo.putVo2(userId, reading);
  }
}

/** Runs `fn` for each item whose Garmin user is connected to a LifeHub user. */
async function forLinked<T extends Item>(
  items: T[] | undefined,
  fn: (userId: string, item: T) => Promise<void>,
  touched: Set<string>,
) {
  for (const item of items ?? []) {
    const userId = item.userId && (await repo.userForGarmin(item.userId));
    if (!userId) continue;
    await fn(userId, item);
    touched.add(userId);
  }
}

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> {
  const app = await getGarminApp();
  if (!app || event.headers?.["garmin-client-id"] !== app.clientId) {
    return reply(401);
  }
  const body = readBody(event);
  const touched = new Set<string>();
  try {
    await forLinked(body.activities, handleActivity, touched);
    await forLinked(body.userMetrics, handleMetrics, touched);
    await forLinked(
      body.deregistrations,
      async (userId, item) => {
        await repo.deleteGarminData(userId, item.userId ?? "");
        touched.delete(userId);
      },
      new Set(),
    );
    const now = new Date().toISOString();
    for (const userId of touched)
      await repo.markSynced(userId, now).catch(() => {});
    return reply(200);
  } catch (error) {
    // A 5xx makes Garmin retry the delivery later.
    console.error(
      "Run webhook error:",
      error instanceof Error ? error.message : error,
    );
    return reply(500);
  }
}
