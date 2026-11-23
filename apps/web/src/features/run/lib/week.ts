import { shiftDays, weekday, weekStart } from "./dates";
import type { Session } from "./sessions";
import { toLb, toMiles } from "./units";

export type StripDay = {
  date: string;
  runLoad: number;
  liftLoad: number;
  miles: number;
  lifted: boolean;
};

/** The last `count` days, oldest first, with each day's run and lift load. */
export function recentDays(
  sessions: Session[],
  today: string,
  count = 14,
): StripDay[] {
  return Array.from({ length: count }, (_, i) => {
    const date = shiftDays(today, i - count + 1);
    const day = sessions.filter((s) => s.date === date);
    const runs = day.filter((s) => s.run);
    const lifts = day.filter((s) => s.lift);
    return {
      date,
      runLoad: runs.reduce((t, s) => t + s.load, 0),
      liftLoad: lifts.reduce((t, s) => t + s.load, 0),
      miles: runs.reduce((t, s) => t + toMiles(s.run?.distanceM ?? 0), 0),
      lifted: lifts.length > 0,
    };
  });
}

export type WeekTotals = {
  miles: number;
  runs: number;
  lifts: number;
  sets: number;
  /** Pounds lifted: weight × reps over every working set. */
  volumeLb: number;
  load: number;
  activeS: number;
};

export function totals(sessions: Session[], from: string, to: string) {
  const t: WeekTotals = {
    miles: 0,
    runs: 0,
    lifts: 0,
    sets: 0,
    volumeLb: 0,
    load: 0,
    activeS: 0,
  };
  for (const s of sessions) {
    if (s.date < from || s.date > to) continue;
    t.load += s.load;
    t.activeS += s.durationS;
    if (s.run) {
      t.runs += 1;
      t.miles += toMiles(s.run.distanceM);
    }
    if (s.lift) {
      t.lifts += 1;
      for (const set of s.lift.sets ?? []) {
        t.sets += 1;
        t.volumeLb += toLb(set.weightKg ?? 0) * set.reps;
      }
    }
  }
  return t;
}

/**
 * This week so far against last week up to the same weekday, so Monday is
 * compared with last Monday rather than with all of last week.
 */
export function weekVsLast(sessions: Session[], today: string) {
  const start = weekStart(today);
  const lastStart = shiftDays(start, -7);
  return {
    now: totals(sessions, start, today),
    last: totals(sessions, lastStart, shiftDays(lastStart, weekday(today))),
  };
}
