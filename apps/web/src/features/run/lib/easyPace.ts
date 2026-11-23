import type { RunActivity } from "@lifehub/shared";
import { shiftDays, weekStart } from "./dates";
import { paceSecondsPerMile } from "./units";

export type PacePoint = {
  /** Monday of the week, "YYYY-MM-DD" */
  week: string;
  /** Seconds per mile across that week's easy runs. */
  pace: number;
};

/**
 * Pace per week across runs whose average heart rate sits in the easy band,
 * for the last `weeks` weeks. Weeks with no easy run are left out.
 */
export function easyPaceByWeek(
  runs: RunActivity[],
  band: { low: number; high: number },
  today: string,
  weeks: number,
): PacePoint[] {
  const first = shiftDays(weekStart(today), -(weeks - 1) * 7);
  const totals = new Map<string, { meters: number; seconds: number }>();
  for (const run of runs) {
    const day = run.start.slice(0, 10);
    if (day < first || day > today) continue;
    if (!run.avgHr || run.avgHr < band.low || run.avgHr > band.high) continue;
    const week = weekStart(day);
    const t = totals.get(week) ?? { meters: 0, seconds: 0 };
    t.meters += run.distanceM;
    t.seconds += run.durationS;
    totals.set(week, t);
  }
  return [...totals]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, t]) => ({
      week,
      pace: paceSecondsPerMile(t.meters, t.seconds),
    }));
}

/** Seconds per mile gained from the first point to the last (positive is faster). */
export function paceGain(points: PacePoint[]): number {
  const first = points[0];
  const last = points.at(-1);
  return first && last ? first.pace - last.pace : 0;
}
