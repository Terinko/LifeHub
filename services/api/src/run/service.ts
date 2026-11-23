import type { LiftSession, RunActivity, RunData } from "@lifehub/shared";
import { HttpError } from "../shared/http";
import { isAdmin, type UserProfile } from "../shared/users";
import { exampleRunData } from "./example";
import {
  hrvReadings,
  isLift,
  isRun,
  searchActivities,
  toLiftSession,
  toRunActivity,
  vo2Readings,
} from "./garmin/activities";
import { liftSets, runDetail } from "./garmin/sync";
import { forgetGarminKey, getGarminKey } from "./garmin/app";
import { bearerToken, GarminError } from "./garmin/http";
import * as repo from "./repository";

// Runs are copied from Garmin at most this often, unless Refresh is pressed.
const SYNC_EVERY_MS = 15 * 60_000;
// Re-read the last few days on each sync: runs can sync from the watch late.
const OVERLAP_DAYS = 3;
const VO2_CHUNK_DAYS = 120;
// HRV is asked for in month-sized pieces, and only for recent months.
const HRV_CHUNK_DAYS = 28;
const HRV_HISTORY_DAYS = 180;
// Each load reads sets and second-by-second detail for a few more
// activities, newest first, until this long after the request started, so
// the page stays quick and the Lambda finishes well inside its 30 seconds.
const DETAIL_UNTIL_MS = 12_000;
// Bumped when a sync starts copying a new kind of data: an owner synced by an
// older version gets the whole history again once (2: strength and HRV).
const SYNC_VERSION = 2;
const DAY_MS = 86_400_000;

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Jan 1 of last year: enough history for the year chart and this year's totals. */
const historyStart = (now: Date) => `${now.getUTCFullYear() - 1}-01-01`;

/** Calls `read` for consecutive date ranges of `days` days from `from` to today. */
async function inChunks(
  from: string,
  now: Date,
  days: number,
  read: (start: string, end: string) => Promise<void>,
) {
  for (let ms = Date.parse(from); ms <= now.getTime(); ms += days * DAY_MS) {
    const end = isoDay(Math.min(ms + (days - 1) * DAY_MS, now.getTime()));
    await read(isoDay(ms), end);
  }
}

/** Runs past the nice-to-have readings (VO2 max, HRV) when they can't be read. */
async function optional(label: string, read: () => Promise<void>) {
  try {
    await read();
  } catch (error) {
    console.warn(`Run: ${label} unavailable`, describe(error));
  }
}

/**
 * A short reason for a failure, safe to show: Garmin errors name only the
 * path and status, and other errors only their type.
 */
function describe(error: unknown): string {
  if (error instanceof GarminError || error instanceof HttpError) {
    return error.message;
  }
  return error instanceof Error ? error.name : "Unknown error";
}

/** Copies activities, VO2 max and HRV from Garmin into the table, from `from` to today. */
async function syncFrom(owner: string, from: string, now: Date) {
  const bearer = await freshBearer(now);
  if (!bearer) return;
  // One day ahead covers activities logged after midnight UTC but before local midnight.
  const to = isoDay(now.getTime() + DAY_MS);
  const activities = await searchActivities(bearer, from, to);
  await repo.putRuns(owner, activities.filter(isRun).map(toRunActivity));
  await repo.putLifts(owner, activities.filter(isLift).map(toLiftSession));
  const hrvFrom = isoDay(
    Math.max(Date.parse(from), now.getTime() - HRV_HISTORY_DAYS * DAY_MS),
  );
  await Promise.all([
    optional("VO2 max", () =>
      inChunks(from, now, VO2_CHUNK_DAYS, async (start, end) =>
        repo.putVo2s(owner, await vo2Readings(bearer, start, end)),
      ),
    ),
    optional("HRV", () =>
      inChunks(hrvFrom, now, HRV_CHUNK_DAYS, async (start, end) =>
        repo.putHrv(owner, await hrvReadings(bearer, start, end)),
      ),
    ),
  ]);
  await repo.markSynced(now.toISOString(), SYNC_VERSION);
}

type Pending = { id: string; kind: "run" | "lift"; start: string };

/**
 * Reads sets (strength) or best efforts and drift (runs) for activities that
 * don't have them yet, newest first, until the time budget runs out. Returns
 * the details it read.
 */
async function readDetails(
  owner: string,
  pending: Pending[],
  now: Date,
  started: number,
): Promise<repo.ActivityDetail[]> {
  if (pending.length === 0) return [];
  const read: repo.ActivityDetail[] = [];
  try {
    const bearer = await freshBearer(now);
    if (!bearer) return [];
    for (const item of pending) {
      if (Date.now() - started > DETAIL_UNTIL_MS) break;
      const detail = await readDetail(bearer, item);
      if (!detail) break;
      await repo.putDetail(owner, detail);
      read.push(detail);
    }
  } catch (error) {
    // Detail is extra: the page still loads with what was read so far.
    console.warn(
      "Run: reading activity detail stopped",
      (error as Error).message,
    );
  }
  return read;
}

// Network trouble, not a problem with the activity itself.
const isTransient = (error: unknown) =>
  (error instanceof GarminError && error.status !== 404) ||
  ["TypeError", "TimeoutError", "AbortError"].includes((error as Error).name);

/** One activity's detail; undefined when Garmin is busy, so the rest wait. */
async function readDetail(
  bearer: string,
  item: Pending,
): Promise<repo.ActivityDetail | undefined> {
  try {
    return item.kind === "lift"
      ? { id: item.id, found: true, sets: await liftSets(bearer, item.id) }
      : { id: item.id, found: true, ...(await runDetail(bearer, item.id)) };
  } catch (error) {
    if (isTransient(error)) {
      console.warn(
        "Run: activity detail unavailable",
        (error as Error).message,
      );
      return undefined;
    }
    // Missing or unreadable: remember that, so it isn't asked again.
    console.warn("Run: no detail for an activity", (error as Error).message);
    return { id: item.id, found: false };
  }
}
/**
 * A bearer token for the current key. When Garmin rejects the key, reads it
 * from Parameter Store again once, in case a new key was stored since this
 * Lambda started.
 */
export async function freshBearer(now: Date): Promise<string | undefined> {
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

/**
 * Copies from Garmin when the last copy is stale. A failed copy doesn't stop
 * the page: it shows what was copied before, with the reason.
 */
async function syncIfStale(
  owner: repo.GarminOwner,
  now: Date,
  force: boolean,
): Promise<{ syncedAt?: string; syncError?: string }> {
  const current = owner.syncVersion === SYNC_VERSION;
  const last = owner.syncedAt ? Date.parse(owner.syncedAt) : undefined;
  if (!force && current && last && now.getTime() - last < SYNC_EVERY_MS)
    return { syncedAt: owner.syncedAt };
  const from =
    current && last ? isoDay(last - OVERLAP_DAYS * DAY_MS) : historyStart(now);
  try {
    await syncFrom(owner.userId, from, now);
    return { syncedAt: now.toISOString() };
  } catch (error) {
    console.error("Run: copying from Garmin failed", error);
    return { syncedAt: owner.syncedAt, syncError: describe(error) };
  }
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
  const started = Date.now();
  const sync = await syncIfStale(owner, now, refresh);
  const from = historyStart(now);
  const [runs, lifts, vo2Max, hrv, details] = await Promise.all([
    repo.listRuns(userId, from),
    repo.listLifts(userId, from),
    repo.listVo2(userId, from),
    repo.listHrv(userId, from),
    repo.listDetails(userId),
  ]);
  const pending: Pending[] = [
    ...runs.map((r) => ({ id: r.id, kind: "run" as const, start: r.start })),
    ...lifts.map((l) => ({ id: l.id, kind: "lift" as const, start: l.start })),
  ]
    .filter((a) => !details.has(a.id))
    .sort((a, b) => b.start.localeCompare(a.start));
  for (const detail of await readDetails(userId, pending, now, started)) {
    details.set(detail.id, detail);
  }
  return {
    source: "garmin",
    garmin: "connected",
    ...sync,
    activities: runs.map((r) => withRunDetail(r, details.get(r.id))),
    lifts: lifts.map((l) => withSets(l, details.get(l.id))),
    vo2Max,
    hrv,
    detailsPending: pending.filter((a) => !details.has(a.id)).length,
  };
}

function withRunDetail(
  run: RunActivity,
  detail: repo.ActivityDetail | undefined,
): RunActivity {
  if (!detail?.found) return run;
  return { ...run, driftPct: detail.driftPct, bestEfforts: detail.bestEfforts };
}

function withSets(
  lift: LiftSession,
  detail: repo.ActivityDetail | undefined,
): LiftSession {
  return detail?.found && detail.sets?.length
    ? { ...lift, sets: detail.sets }
    : lift;
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
