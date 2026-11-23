import type { RunActivity } from "@lifehub/shared";
import { toMiles } from "./units";

/** Miles run on each local date ("YYYY-MM-DD"), all runs that day added up. */
export function milesByDay(runs: RunActivity[]): Map<string, number> {
  const days = new Map<string, number>();
  for (const run of runs) {
    const key = run.start.slice(0, 10);
    days.set(key, (days.get(key) ?? 0) + toMiles(run.distanceM));
  }
  return days;
}

/** Total miles on the dates from `from` to `to`, both included. */
export function milesBetween(
  days: Map<string, number>,
  from: string,
  to: string,
): number {
  let total = 0;
  for (const [key, miles] of days) {
    if (key >= from && key <= to) total += miles;
  }
  return total;
}

/** Runs, newest first. */
export const newestFirst = (runs: RunActivity[]) =>
  [...runs].sort((a, b) => b.start.localeCompare(a.start));
