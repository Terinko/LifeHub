import { shiftDays, weekStart } from "./dates";

/** 0 is a rest day; 1–4 step up with the day's miles (4 is 10+ mi). */
export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export type HeatDay = {
  date: string;
  miles: number;
  /** undefined for days still to come this week. */
  level: HeatLevel | undefined;
};

export function heatLevel(miles: number): HeatLevel {
  if (miles <= 0) return 0;
  if (miles < 4) return 1;
  if (miles < 7) return 2;
  if (miles < 10) return 3;
  return 4;
}

/**
 * The last `weeks` weeks of days, Monday first, column by column (one column
 * per week), for the run-day grid.
 */
export function heatDays(
  days: Map<string, number>,
  today: string,
  weeks: number,
): HeatDay[] {
  const first = shiftDays(weekStart(today), -(weeks - 1) * 7);
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const date = shiftDays(first, i);
    const miles = days.get(date) ?? 0;
    return {
      date,
      miles,
      level: date > today ? undefined : heatLevel(miles),
    };
  });
}
