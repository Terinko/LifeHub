import type {
  RunActivity,
  RunBestEfforts,
  RunVo2Reading,
} from "@lifehub/shared";
import { shiftDays, weekStart } from "./dates";
import { milesBetween } from "./days";
import { RECORD_DISTANCES, type RunRecord } from "./records";
import { toMiles } from "./units";

export type MixWeek = {
  /** Monday, "YYYY-MM-DD" */
  week: string;
  /** Percent of running time in zones 1–2, 3 and 4–5. */
  easy: number;
  moderate: number;
  hard: number;
};

/** Time in heart-rate zones per week for the last `weeks` weeks (weeks without zones left out). */
export function intensityMix(
  runs: RunActivity[],
  today: string,
  weeks: number,
): MixWeek[] {
  const first = shiftDays(weekStart(today), -(weeks - 1) * 7);
  const sums = new Map<string, number[]>();
  for (const run of runs) {
    const day = run.start.slice(0, 10);
    if (day < first || day > today || !run.zoneSecs) continue;
    const week = weekStart(day);
    const z = sums.get(week) ?? [0, 0, 0, 0, 0];
    run.zoneSecs.forEach((s, i) => (z[i] = (z[i] ?? 0) + s));
    sums.set(week, z);
  }
  return [...sums]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([week, z]) => {
      const [z1 = 0, z2 = 0, z3 = 0, z4 = 0, z5 = 0] = z;
      const total = z1 + z2 + z3 + z4 + z5;
      if (total === 0) return [];
      const easy = Math.round(((z1 + z2) / total) * 100);
      const moderate = Math.round((z3 / total) * 100);
      return [{ week, easy, moderate, hard: 100 - easy - moderate }];
    });
}

// Daniels and Gilbert: oxygen cost of running at v meters/minute, and the
// share of VO2 max that can be held for t minutes.
const oxygenCost = (v: number) => -4.6 + 0.182258 * v + 0.000104 * v * v;
const sustainable = (t: number) =>
  0.8 +
  0.1894393 * Math.exp(-0.012778 * t) +
  0.2989558 * Math.exp(-0.1932605 * t);

/** Predicted race time in seconds for `meters` at a VO2 max, by bisection. */
export function predictSeconds(vo2max: number, meters: number): number {
  let lo = 1;
  let hi = 600;
  for (let i = 0; i < 60; i++) {
    const t = (lo + hi) / 2;
    const needed = oxygenCost(meters / t) / sustainable(t);
    if (needed > vo2max) lo = t;
    else hi = t;
  }
  return Math.round(((lo + hi) / 2) * 60);
}

export const RACES = [
  { key: "k5", label: "5K", meters: 5000 },
  { key: "k10", label: "10K", meters: 10000 },
  { key: "half", label: "Half marathon", meters: 21097.5 },
  { key: "full", label: "Marathon", meters: 42195 },
] as const;

export type RacePrediction = {
  label: string;
  seconds: number;
  /** Seconds faster (positive) since the first reading in the window. */
  change: number;
  /** Predicted seconds at each reading, oldest first, for a sparkline. */
  trend: number[];
};

/** Race predictions from the latest VO2 max, and how they moved since `since`. */
export function racePredictions(
  readings: RunVo2Reading[],
  since: string,
): RacePrediction[] {
  const sorted = [...readings].sort((a, b) => a.date.localeCompare(b.date));
  const window = sorted.filter((r) => r.date >= since);
  const points = window.length ? window : sorted.slice(-1);
  const latest = points.at(-1);
  if (!latest) return [];
  return RACES.map(({ label, meters }) => {
    const trend = points.map((r) => predictSeconds(r.value, meters));
    const seconds = trend.at(-1) ?? 0;
    return { label, seconds, change: (trend[0] ?? seconds) - seconds, trend };
  });
}

/**
 * Fastest time at each distance: the best stretch inside any run when
 * Garmin's detail has been read, otherwise whole runs of about that length.
 */
export function effortRecords(
  runs: RunActivity[],
  wholeRuns: RunRecord[],
): RunRecord[] {
  const keys: (keyof RunBestEfforts)[] = ["mile", "k5", "k10", "half"];
  return RECORD_DISTANCES.map(({ label }, i) => {
    const key = keys[i];
    let best = wholeRuns[i] ?? { label, seconds: undefined, date: undefined };
    for (const run of runs) {
      const s = key ? run.bestEfforts?.[key] : undefined;
      if (s !== undefined && (best.seconds === undefined || s < best.seconds))
        best = { label, seconds: s, date: run.start.slice(0, 10) };
    }
    return best;
  });
}

/** Average miles over the last `weeks` finished weeks. */
export function averageWeek(
  days: Map<string, number>,
  today: string,
  weeks = 4,
): number {
  const end = shiftDays(weekStart(today), -1);
  return milesBetween(days, shiftDays(end, -(weeks * 7 - 1)), end) / weeks;
}

/** The longest run in the last four weeks, in miles. */
export function longestRun(runs: RunActivity[], today: string): number {
  const from = shiftDays(today, -27);
  return Math.max(
    0,
    ...runs
      .filter((r) => r.start.slice(0, 10) >= from)
      .map((r) => toMiles(r.distanceM)),
  );
}
