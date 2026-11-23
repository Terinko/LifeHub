import type { RunActivity, RunVo2Reading } from "@lifehub/shared";
import { garminGet } from "./http";

/** An activity from Garmin's activity search (only the fields LifeHub reads). */
export type GarminActivity = {
  activityId: number;
  activityName?: string;
  /** Local wall-clock start, "YYYY-MM-DD HH:mm:ss". */
  startTimeLocal: string;
  activityType?: { typeKey?: string };
  /** Meters */
  distance?: number;
  /** Seconds */
  duration?: number;
  averageHR?: number;
  /** Meters */
  elevationGain?: number;
};

const PAGE = 100;

/**
 * Every running activity (road, trail, treadmill, track…) that started on the
 * local dates `from` to `to`, both "YYYY-MM-DD", following Garmin's pages.
 */
export async function searchRuns(
  bearer: string,
  from: string,
  to: string,
): Promise<GarminActivity[]> {
  const all: GarminActivity[] = [];
  for (let start = 0; ; start += PAGE) {
    const page = await garminGet<GarminActivity[]>(
      "/activitylist-service/activities/search/activities",
      {
        start,
        limit: PAGE,
        startDate: from,
        endDate: to,
        activityType: "running",
      },
      bearer,
    );
    all.push(...page);
    if (page.length < PAGE) return all;
  }
}

export const isRun = (a: GarminActivity) =>
  !!a.activityType?.typeKey?.includes("running") && (a.distance ?? 0) > 0;

export function toRunActivity(a: GarminActivity): RunActivity {
  return {
    id: String(a.activityId),
    start: a.startTimeLocal.replace(" ", "T").slice(0, 19),
    name: a.activityName?.trim() || "Run",
    distanceM: Math.round(a.distance ?? 0),
    durationS: Math.round(a.duration ?? 0),
    avgHr: a.averageHR === undefined ? undefined : Math.round(a.averageHR),
    elevGainM:
      a.elevationGain === undefined ? undefined : Math.round(a.elevationGain),
  };
}

/** One day from Garmin's VO2 max ("maxmet") history. */
type GarminMaxMet = {
  generic?: {
    calendarDate?: string;
    vo2MaxPreciseValue?: number;
    vo2MaxValue?: number;
  };
};

/** Running VO2 max readings between two local dates. */
export async function vo2Readings(
  bearer: string,
  from: string,
  to: string,
): Promise<RunVo2Reading[]> {
  const days = await garminGet<GarminMaxMet[]>(
    `/metrics-service/metrics/maxmet/daily/${from}/${to}`,
    { sport: "RUNNING" },
    bearer,
  );
  return days.flatMap(({ generic }) => {
    const value = generic?.vo2MaxPreciseValue ?? generic?.vo2MaxValue;
    return generic?.calendarDate && value
      ? [{ date: generic.calendarDate, value: Math.round(value) }]
      : [];
  });
}
