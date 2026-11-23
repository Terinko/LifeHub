import type { GarminCheck, GarminCheckLine } from "@lifehub/shared";
import { HttpError } from "../shared/http";
import {
  hrvReadings,
  isLift,
  isRun,
  searchActivities,
  toRunActivity,
  vo2Readings,
} from "./garmin/activities";
import { activityFit } from "./garmin/fit";
import { GarminError, garminGet } from "./garmin/http";
import { liftSets } from "./garmin/sync";
import * as repo from "./repository";
import { freshBearer } from "./service";

const DAY_MS = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * The owner's data check: asks Garmin for each kind of data the dashboard
 * uses and reports what came back, so a missing piece is plain to see.
 */
export async function checkGarmin(userId: string): Promise<GarminCheck> {
  const owner = await repo.getOwner();
  if (owner?.userId !== userId)
    throw new HttpError(403, "Only the account Garmin is connected to");
  const now = new Date();
  const lines: GarminCheckLine[] = [];
  const line = (label: string, ok: boolean, detail: string) =>
    lines.push({ label, ok, detail });
  const failed = (error: unknown) =>
    error instanceof GarminError
      ? `Garmin answered HTTP ${error.status}`
      : (error as Error).message;

  const bearer = await freshBearer(now);
  if (!bearer) throw new HttpError(503, "Garmin isn't set up yet");
  line("Key", true, "Garmin accepted the key");

  const from = isoDay(now.getTime() - 60 * DAY_MS);
  const activities = await searchActivities(
    bearer,
    from,
    isoDay(now.getTime() + DAY_MS),
  );
  const types = new Map<string, number>();
  for (const a of activities) {
    const t = a.activityType?.typeKey ?? "unknown";
    types.set(t, (types.get(t) ?? 0) + 1);
  }
  line(
    "Activities, last 60 days",
    activities.length > 0,
    [...types].map(([t, n]) => `${n} ${t}`).join(", ") || "none",
  );

  const run = activities.find(isRun);
  const lift = activities.find(isLift);
  if (run) {
    const r = toRunActivity(run);
    line(
      "Training load",
      r.load !== undefined,
      r.load === undefined
        ? "Not in the activity summary"
        : `Latest run: ${r.load}`,
    );
    line(
      "Heart-rate zones",
      !!r.zoneSecs,
      r.zoneSecs
        ? "Time in zones is in the activity summary"
        : "Not in the activity summary",
    );
    try {
      const fit = await activityFit(bearer, r.id);
      const records = fit.recordMesgs ?? [];
      const withHr = records.filter((m) => m.heartRate).length;
      line(
        "Run detail (FIT file)",
        records.length > 0,
        `${records.length} samples, ${withHr} with heart rate`,
      );
    } catch (error) {
      line("Run detail (FIT file)", false, failed(error));
    }
  } else {
    line("Runs", false, "No run in the last 60 days");
  }

  if (lift) {
    try {
      const res = await garminGet<{ exerciseSets?: unknown[] }>(
        `/activity-service/activity/${lift.activityId}/exerciseSets`,
        {},
        bearer,
      );
      line(
        "Strength sets (activity)",
        (res.exerciseSets?.length ?? 0) > 0,
        `${res.exerciseSets?.length ?? 0} sets`,
      );
    } catch (error) {
      line("Strength sets (activity)", false, failed(error));
    }
    try {
      const fit = await activityFit(bearer, String(lift.activityId));
      const sets = fit.setMesgs ?? [];
      line(
        "Strength sets (FIT file)",
        sets.length > 0,
        `${sets.length} set records`,
      );
    } catch (error) {
      line("Strength sets (FIT file)", false, failed(error));
    }
    try {
      const sets = await liftSets(bearer, String(lift.activityId));
      const names = [...new Set(sets.map((s) => s.exercise))];
      line(
        "Lifts read",
        sets.length > 0,
        sets.length
          ? `${sets.length} working sets: ${names.join(", ")}`
          : "No working sets found",
      );
    } catch (error) {
      line("Lifts read", false, failed(error));
    }
  } else {
    line(
      "Strength sessions",
      false,
      "No strength activity in the last 60 days",
    );
  }

  try {
    const vo2 = await vo2Readings(
      bearer,
      isoDay(now.getTime() - 119 * DAY_MS),
      isoDay(now.getTime()),
    );
    line("VO₂ max", vo2.length > 0, `${vo2.length} readings in 120 days`);
  } catch (error) {
    line("VO₂ max", false, failed(error));
  }
  try {
    const hrv = await hrvReadings(
      bearer,
      isoDay(now.getTime() - 27 * DAY_MS),
      isoDay(now.getTime()),
    );
    line("HRV", hrv.length > 0, `${hrv.length} nights in the last 4 weeks`);
  } catch (error) {
    line("HRV", false, failed(error));
  }
  return { lines };
}
