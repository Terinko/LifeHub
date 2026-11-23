import type { RunData, RunGarminCallback } from "@lifehub/shared";
import { badRequest, HttpError } from "../shared/http";
import { exampleRunData } from "./example";
import { deregister, garminUserId, requestBackfill } from "./garmin/api";
import { getGarminApp, type GarminApp } from "./garmin/app";
import { GarminError } from "./garmin/http";
import {
  authorizeUrl,
  exchangeCode,
  newPkce,
  refreshTokens,
} from "./garmin/oauth";
import * as repo from "./repository";

// Sign-in attempts older than this are refused.
const PKCE_TTL_MS = 15 * 60_000;

/** Where Garmin may send the browser back to: the Run page on LifeHub's own sites. */
function checkRedirect(redirectUri: string) {
  const allowed = (process.env.RUN_REDIRECT_URIS ?? "").split(",");
  if (!allowed.includes(redirectUri))
    throw badRequest("Unknown redirect address");
}

async function requireApp(): Promise<GarminApp> {
  const app = await getGarminApp();
  if (!app) throw new HttpError(503, "Garmin isn't set up yet");
  return app;
}

/** Jan 1 of last year: enough history for the year chart and this year's totals. */
const historyStart = (now: Date) => `${now.getUTCFullYear() - 1}-01-01`;

/** The caller's runs from Garmin, or example runs until they connect. */
export async function getRunData(
  userId: string,
  now = new Date(),
): Promise<RunData> {
  const [app, link] = await Promise.all([getGarminApp(), repo.getLink(userId)]);
  if (!app || !link) {
    return {
      ...exampleRunData(now),
      garmin: app ? "not-connected" : "unavailable",
    };
  }
  const from = historyStart(now);
  const [activities, vo2Max] = await Promise.all([
    repo.listRuns(userId, from),
    repo.listVo2(userId, from),
  ]);
  return {
    source: "garmin",
    garmin: "connected",
    syncedAt: link.syncedAt,
    activities,
    vo2Max,
  };
}

/** Starts Garmin sign-in: remembers a PKCE verifier and returns the consent URL. */
export async function startConnect(userId: string, redirectUri: string) {
  checkRedirect(redirectUri);
  const app = await requireApp();
  const pkce = newPkce();
  await repo.savePkce(userId, pkce.state, pkce.verifier);
  return { url: authorizeUrl(app, pkce, redirectUri) };
}

/** Finishes sign-in: trades the code for tokens, links the account, asks for history. */
export async function finishConnect(
  userId: string,
  { code, state, redirectUri }: RunGarminCallback,
  now = new Date(),
) {
  checkRedirect(redirectUri);
  const app = await requireApp();
  const attempt = await repo.takePkce(userId, state);
  if (!attempt || now.getTime() - Date.parse(attempt.createdAt) > PKCE_TTL_MS) {
    throw badRequest("That Garmin sign-in expired. Try connecting again.");
  }
  const tokens = await exchangeCode(
    app,
    code,
    attempt.verifier,
    redirectUri,
    now,
  );
  const gid = await garminUserId(tokens.accessToken);
  const owner = await repo.userForGarmin(gid);
  if (owner && owner !== userId) {
    throw new HttpError(
      409,
      "That Garmin account is connected to someone else",
    );
  }
  await repo.putLink(userId, {
    ...tokens,
    garminUserId: gid,
    connectedAt: now.toISOString(),
  });
  const fromS = Math.floor(Date.parse(`${historyStart(now)}T00:00:00Z`) / 1000);
  await requestBackfill(
    tokens.accessToken,
    fromS,
    Math.floor(now.getTime() / 1000),
  );
}

/** A usable access token for a linked user, refreshing it when it's about to expire. */
export async function accessTokenFor(
  userId: string,
  link: repo.GarminLink,
  now = new Date(),
): Promise<string> {
  if (Date.parse(link.expiresAt) > now.getTime()) return link.accessToken;
  const tokens = await refreshTokens(
    await requireApp(),
    link.refreshToken,
    now,
  );
  await repo.saveTokens(userId, tokens);
  return tokens.accessToken;
}

/** Disconnects Garmin and deletes everything it sent. */
export async function disconnect(userId: string) {
  const link = await repo.getLink(userId);
  if (!link) return;
  try {
    await deregister(await accessTokenFor(userId, link));
  } catch (error) {
    // Already revoked on Garmin's side: still forget it here.
    if (!(error instanceof GarminError)) throw error;
    console.warn("Run: Garmin deregistration failed", error.message);
  }
  await repo.deleteGarminData(userId, link.garminUserId);
}
