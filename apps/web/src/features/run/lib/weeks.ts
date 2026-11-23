import { shiftDays, shortDate, weekStart } from "./dates";
import { milesBetween } from "./days";

export type WeekRange = "8wk" | "16wk" | "1yr";

export const WEEK_COUNTS: Record<WeekRange, number> = {
  "8wk": 8,
  "16wk": 16,
  "1yr": 52,
};

export type WeekTotal = {
  /** Monday, "YYYY-MM-DD" */
  start: string;
  /** "Nov 23" */
  label: string;
  miles: number;
  /** This week, still in progress. */
  current: boolean;
};

/** Miles per Monday-to-Sunday week, oldest first, ending with this week. */
export function weeklyTotals(
  days: Map<string, number>,
  today: string,
  count: number,
): WeekTotal[] {
  const thisWeek = weekStart(today);
  return Array.from({ length: count }, (_, i) => {
    const start = shiftDays(thisWeek, (i - count + 1) * 7);
    return {
      start,
      label: shortDate(start),
      miles: milesBetween(days, start, shiftDays(start, 6)),
      current: start === thisWeek,
    };
  });
}

/** Finished weeks in a row, newest back, that reached the goal. */
export function weeksAtGoal(weeks: WeekTotal[], goal: number): number {
  let count = 0;
  for (const week of [...weeks].reverse()) {
    if (week.current) continue;
    if (week.miles < goal) break;
    count += 1;
  }
  return count;
}

/** The chart's value axis: a round top above the data and goal, and its ticks. */
export function weekAxis(weeks: WeekTotal[], goal: number) {
  const top = Math.max(goal, ...weeks.map((w) => w.miles));
  const step = top < 50 ? 10 : 20;
  const max = Math.floor(top / step) * step + step;
  const ticks = Array.from(
    { length: max / step + 1 },
    (_, i) => max - i * step,
  );
  return { max, ticks };
}

/** Label every `every`-th bar, counting back from this week so it's always labeled. */
export const showsLabel = (index: number, count: number, every: number) =>
  (count - 1 - index) % every === 0;

export const LABEL_EVERY: Record<WeekRange, number> = {
  "8wk": 2,
  "16wk": 3,
  "1yr": 8,
};
