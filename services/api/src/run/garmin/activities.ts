import type {
  HrvReading,
  LiftSession,
  RunActivity,
  RunVo2Reading,
} from "@lifehub/shared";
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
  activityTrainingLoad?: number;
  hrTimeInZone_1?: number;
  hrTimeInZone_2?: number;
  hrTimeInZone_3?: number;
  hrTimeInZone_4?: number;
  hrTimeInZone_5?: number;
};

const PAGE = 100;

/**
 * Every activity (runs, strength and anything else) that started on the
 * local dates `from` to `to`, both "YYYY-MM-DD", following Garmin's pages.
 */
export async function searchActivities(
  bearer: string,
  from: string,
  to: string,
): Promise<GarminActivity[]> {
  const all: GarminActivity[] = [];
  for (let start = 0; ; start += PAGE) {
    const page = await garminGet<GarminActivity[]>(
      "/activitylist-service/activities/search/activities",
      { start, limit: PAGE, startDate: from, endDate: to },
      bearer,
    );
    all.push(...page);
    if (page.length < PAGE) return all;
  }
}

export const isRun = (a: GarminActivity) =>
  !!a.activityType?.typeKey?.includes("running") && (a.distance ?? 0) > 0;

export const isLift = (a: GarminActivity) =>
  !!a.activityType?.typeKey?.includes("strength");

const startOf = (a: GarminActivity) =>
  a.startTimeLocal.replace(" ", "T").slice(0, 19);

const round = (n: number | null | undefined) =>
  n === undefined || n === null ? undefined : Math.round(n);

function zoneSecs(a: GarminActivity): number[] | undefined {
  const zones = [
    a.hrTimeInZone_1,
    a.hrTimeInZone_2,
    a.hrTimeInZone_3,
    a.hrTimeInZone_4,
    a.hrTimeInZone_5,
  ];
  if (zones.every((z) => z === undefined || z === null)) return undefined;
  return zones.map((z) => Math.round(z ?? 0));
}

export function toLiftSession(a: GarminActivity): LiftSession {
  return {
    id: String(a.activityId),
    start: startOf(a),
    name: a.activityName?.trim() || "Strength",
    durationS: Math.round(a.duration ?? 0),
    avgHr: round(a.averageHR),
    load: round(a.activityTrainingLoad),
  };
}

export function toRunActivity(a: GarminActivity): RunActivity {
  return {
    id: String(a.activityId),
    start: startOf(a),
    name: a.activityName?.trim() || "Run",
    distanceM: Math.round(a.distance ?? 0),
    durationS: Math.round(a.duration ?? 0),
    avgHr: round(a.averageHR),
    elevGainM: round(a.elevationGain),
    load: round(a.activityTrainingLoad),
    zoneSecs: zoneSecs(a),
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

/** One night from Garmin's HRV history. */
type GarminHrvDay = { calendarDate?: string; lastNightAvg?: number | null };

/** Overnight HRV between two local dates; nights without the watch are absent. */
export async function hrvReadings(
  bearer: string,
  from: string,
  to: string,
): Promise<HrvReading[]> {
  const res = await garminGet<{ hrvSummaries?: GarminHrvDay[] }>(
    `/hrv-service/hrv/daily/${from}/${to}`,
    {},
    bearer,
  );
  return (res.hrvSummaries ?? []).flatMap((d) =>
    d.calendarDate && d.lastNightAvg
      ? [{ date: d.calendarDate, value: Math.round(d.lastNightAvg) }]
      : [],
  );
}
