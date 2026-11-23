import type { RunData } from "@lifehub/shared";
import { HttpError } from "../shared/http";
import { isAdmin, type UserProfile } from "../shared/users";
import { exampleRunData } from "./example";
import {
  isRun,
  searchRuns,
  toRunActivity,
  vo2Readings,
} from "./garmin/activities";
import { forgetGarminKey, getGarminKey } from "./garmin/app";
import { bearerToken, GarminError } from "./garmin/http";
import * as repo from "./repository";

// Runs are copied from Garmin at most this often, unless Refresh is pressed.
const SYNC_EVERY_MS = 15 * 60_000;
// Re-read the last few days on each sync: runs can sync from the watch late.
const OVERLAP_DAYS = 3;
const VO2_CHUNK_DAYS = 120;
const DAY_MS = 86_400_000;

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Jan 1 of last year: enough history for the year chart and this year's totals. */
const historyStart = (now: Date) => `${now.getUTCFullYear() - 1}-01-01`;

/** Copies runs and VO2 max from Garmin into the table, from `from` to today. */
async function syncFrom(owner: string, from: string, now: Date) {
  const bearer = await freshBearer(now);
  if (!bearer) return;
  // One day ahead covers runs logged after midnight UTC but before local midnight.
  const to = isoDay(now.getTime() + DAY_MS);
  const runs = await searchRuns(bearer, from, to);
  await repo.putRuns(owner, runs.filter(isRun).map(toRunActivity));
  for (
    let ms = Date.parse(from);
    ms <= now.getTime();
    ms += VO2_CHUNK_DAYS * DAY_MS
  ) {
    const end = isoDay(
      Math.min(ms + (VO2_CHUNK_DAYS - 1) * DAY_MS, now.getTime()),
    );
    try {
      await repo.putVo2s(owner, await vo2Readings(bearer, isoDay(ms), end));
    } catch (error) {
      // VO2 max is a nice-to-have; the runs still count without it.
      if (!(error instanceof GarminError)) throw error;
      console.warn("Run: VO2 max unavailable", error.message);
    }
  }
  await repo.markSynced(now.toISOString());
}

/**
 * A bearer token for the current key. When Garmin rejects the key, reads it
 * from Parameter Store again once, in case a new key was stored since this
 * Lambda started.
 */
async function freshBearer(now: Date): Promise<string | undefined> {
  const key = await getGarminKey();
  if (!key) return undefined;
  try {
    return await bearerToken(key, now.getTime());
  } catch (error) {
    if (!(error instanceof GarminError) || error.status !== 401) throw error;
    forgetGarminKey();
    const newKey = await getGarminKey();
    if (!newKey || newKey === key) {
      throw new HttpError(502, "Garmin rejected the key. It may have expired.");
    }
    return bearerToken(newKey, now.getTime());
  }
}

async function syncIfStale(owner: repo.GarminOwner, now: Date, force: boolean) {
  const last = owner.syncedAt ? Date.parse(owner.syncedAt) : undefined;
  if (!force && last && now.getTime() - last < SYNC_EVERY_MS)
    return owner.syncedAt;
  const from = last ? isoDay(last - OVERLAP_DAYS * DAY_MS) : historyStart(now);
  await syncFrom(owner.userId, from, now);
  return now.toISOString();
}

/**
 * The caller's runs: from Garmin when they own the Personal API key (copying
 * new runs first when the last copy is stale or `refresh` is set), otherwise
 * example runs.
 */
export async function getRunData(
  userId: string,
  profile: UserProfile | undefined,
  { refresh = false, now = new Date() } = {},
): Promise<RunData> {
  const [key, owner] = await Promise.all([getGarminKey(), repo.getOwner()]);
  if (!key || owner?.userId !== userId) {
    const garmin =
      key && !owner && isAdmin(profile) ? "available" : "unavailable";
    return { ...exampleRunData(now), garmin };
  }
  const syncedAt = await syncIfStale(owner, now, refresh);
  const from = historyStart(now);
  const [activities, vo2Max] = await Promise.all([
    repo.listRuns(userId, from),
    repo.listVo2(userId, from),
  ]);
  return {
    source: "garmin",
    garmin: "connected",
    syncedAt,
    activities,
    vo2Max,
  };
}

/** An admin claims the Garmin key as theirs; the first load copies their history. */
export async function connect(
  userId: string,
  profile: UserProfile | undefined,
) {
  if (!isAdmin(profile))
    throw new HttpError(403, "Only an admin can connect Garmin");
  if (!(await getGarminKey()))
    throw new HttpError(503, "Garmin isn't set up yet");
  const now = new Date();
  if (!(await repo.claimOwner(userId, now.toISOString()))) {
    throw new HttpError(409, "Garmin is already connected to another account");
  }
  return getRunData(userId, profile, { now });
}

/** The owner disconnects: forget the claim and every copied run. */
export async function disconnect(
  userId: string,
  profile: UserProfile | undefined,
) {
  const owner = await repo.getOwner();
  if (owner?.userId === userId) await repo.deleteGarminData(userId);
  return getRunData(userId, profile);
}
