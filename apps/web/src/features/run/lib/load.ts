import { shiftDays, weekStart } from "./dates";
import type { Session } from "./sessions";

/** Training load per day ("YYYY-MM-DD"), runs and lifts added together. */
export function loadByDay(sessions: Session[]): Map<string, number> {
  const days = new Map<string, number>();
  for (const s of sessions) days.set(s.date, (days.get(s.date) ?? 0) + s.load);
  return days;
}

const sumDays = (days: Map<string, number>, from: string, to: string) => {
  let total = 0;
  for (const [day, load] of days) if (day >= from && day <= to) total += load;
  return total;
};

/**
 * Acute to chronic load: the last 7 days against the weekly average of the
 * last 28. 0.8–1.3 is the band where fitness builds without a spike.
 * undefined until there are four weeks of training.
 */
export function loadRatio(
  days: Map<string, number>,
  day: string,
): number | undefined {
  const acute = sumDays(days, shiftDays(day, -6), day);
  const chronic = sumDays(days, shiftDays(day, -27), day) / 4;
  return chronic > 0 ? acute / chronic : undefined;
}

export const LOAD_BAND = { low: 0.8, high: 1.3 } as const;

export type RatioPoint = { day: string; ratio: number };

/** The ratio at the end of each of the last `weeks` weeks, and today. */
export function ratioByWeek(
  days: Map<string, number>,
  today: string,
  weeks: number,
): RatioPoint[] {
  const thisWeek = weekStart(today);
  const ends = Array.from({ length: weeks - 1 }, (_, i) =>
    shiftDays(thisWeek, (i - weeks + 1) * 7 + 6),
  );
  return [...ends, today].flatMap((day) => {
    const ratio = loadRatio(days, day);
    return ratio === undefined ? [] : [{ day, ratio }];
  });
}

export const ratioTone = (ratio: number) =>
  ratio > LOAD_BAND.high ? "high" : ratio < LOAD_BAND.low ? "low" : "balanced";
