import type { RunActivity, RunVo2Reading } from "@lifehub/shared";

/** An activity summary as Garmin pushes it (only the fields LifeHub reads). */
export type GarminActivity = {
  userId: string;
  summaryId: string;
  activityType?: string;
  activityName?: string;
  startTimeInSeconds: number;
  startTimeOffsetInSeconds?: number;
  durationInSeconds: number;
  distanceInMeters?: number;
  averageHeartRateInBeatsPerMinute?: number;
  totalElevationGainInMeters?: number;
};

/** A user-metrics summary (VO2 max and fitness age). */
export type GarminUserMetrics = {
  userId: string;
  calendarDate: string;
  vo2Max?: number;
};

// RUNNING, TRAIL_RUNNING, TREADMILL_RUNNING, TRACK_RUNNING and so on.
export const isRun = (a: GarminActivity) =>
  !!a.activityType?.includes("RUNNING") && (a.distanceInMeters ?? 0) > 0;

/** Local wall-clock start, from Garmin's UTC seconds and the zone offset. */
const localStart = (a: GarminActivity) =>
  new Date((a.startTimeInSeconds + (a.startTimeOffsetInSeconds ?? 0)) * 1000)
    .toISOString()
    .slice(0, 19);

const DEFAULT_NAMES: Record<string, string> = {
  TRAIL_RUNNING: "Trail run",
  TREADMILL_RUNNING: "Treadmill run",
  TRACK_RUNNING: "Track run",
};

export function toRunActivity(a: GarminActivity): RunActivity {
  return {
    id: a.summaryId,
    start: localStart(a),
    name:
      a.activityName?.trim() || DEFAULT_NAMES[a.activityType ?? ""] || "Run",
    distanceM: Math.round(a.distanceInMeters ?? 0),
    durationS: Math.round(a.durationInSeconds),
    avgHr: a.averageHeartRateInBeatsPerMinute,
    elevGainM: a.totalElevationGainInMeters,
  };
}

export const toVo2Reading = (
  m: GarminUserMetrics,
): RunVo2Reading | undefined =>
  typeof m.vo2Max === "number" && m.vo2Max > 0
    ? { date: m.calendarDate, value: Math.round(m.vo2Max) }
    : undefined;
