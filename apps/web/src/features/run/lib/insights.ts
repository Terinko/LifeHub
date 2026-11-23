import type { HrvReading } from "@lifehub/shared";
import { shiftDays, weekday, weekStart } from "./dates";
import type { RotationEntry } from "./rotation";
import type { Session, Slot } from "./sessions";
import { EASY_HR, REFERENCE_HR } from "./settings";

/** An easy run's speed per heartbeat (meters a minute per bpm). */
function efficiency(s: Session): number | undefined {
  const r = s.run;
  if (!r?.avgHr || r.durationS < 15 * 60) return undefined;
  if (r.avgHr < EASY_HR.low - 10 || r.avgHr > EASY_HR.high + 5)
    return undefined;
  return r.distanceM / (r.durationS / 60) / r.avgHr;
}

/** Seconds per mile at `REFERENCE_HR` for an average efficiency. */
const paceAtReference = (eff: number) => 1609.344 / ((eff * REFERENCE_HR) / 60);

export type DayBeforeGroup = {
  label: string;
  /** Seconds per mile at the reference heart rate. */
  pace: number;
  runs: number;
};

// Fewer runs than this in a group and its average means little.
export const MIN_RUNS = 3;

/**
 * Easy-run pace at the same heart rate, grouped by what was done the day
 * before: rest, Back + Bi or Chest + Tri. Groups under `MIN_RUNS` are left out.
 */
export function dayBeforeEffect(sessions: Session[], since: string) {
  const byDay = new Map<string, Session[]>();
  for (const s of sessions)
    byDay.set(s.date, [...(byDay.get(s.date) ?? []), s]);
  const groups: Record<"rest" | "back" | "chest", number[]> = {
    rest: [],
    back: [],
    chest: [],
  };
  for (const s of sessions) {
    if (s.date < since) continue;
    const eff = efficiency(s);
    if (eff === undefined) continue;
    const before = byDay.get(shiftDays(s.date, -1)) ?? [];
    const lift = before.find((b) => b.lift);
    if (before.length === 0) groups.rest.push(eff);
    else if (lift?.kind === "back") groups.back.push(eff);
    else if (lift?.kind === "chest") groups.chest.push(eff);
  }
  const labels = {
    rest: "After a rest day",
    back: "After Back + Bi",
    chest: "After Chest + Tri",
  };
  return (Object.keys(groups) as (keyof typeof groups)[]).flatMap((k) => {
    const effs = groups[k];
    if (effs.length < MIN_RUNS) return [];
    const avg = effs.reduce((a, b) => a + b, 0) / effs.length;
    return [
      {
        key: k,
        label: labels[k],
        pace: paceAtReference(avg),
        runs: effs.length,
      },
    ];
  });
}

export type TimeWeek = { week: string; runS: number; liftS: number };

/** Hours running and lifting per week, for the last `weeks` weeks. */
export function timeByWeek(
  sessions: Session[],
  today: string,
  weeks: number,
): TimeWeek[] {
  const thisWeek = weekStart(today);
  return Array.from({ length: weeks }, (_, i) => {
    const week = shiftDays(thisWeek, (i - weeks + 1) * 7);
    const end = shiftDays(week, 6);
    let runS = 0;
    let liftS = 0;
    for (const s of sessions) {
      if (s.date < week || s.date > end) continue;
      if (s.run) runS += s.durationS;
      else liftS += s.durationS;
    }
    return { week, runS, liftS };
  });
}

export type AdherenceWeek = {
  week: string;
  cells: { slot: Slot; status: RotationEntry["status"] }[];
};

/** Rotation entries grouped by week, for the last `weeks` weeks. */
export function adherenceByWeek(
  entries: RotationEntry[],
  today: string,
  weeks: number,
): AdherenceWeek[] {
  const thisWeek = weekStart(today);
  return Array.from({ length: weeks }, (_, i) => {
    const week = shiftDays(thisWeek, (i - weeks + 1) * 7);
    const end = shiftDays(week, 6);
    return {
      week,
      cells: entries
        .filter((e) => e.date >= week && e.date <= end)
        .map(({ slot, status }) => ({ slot, status })),
    };
  });
}

/** Easy pace at the reference heart rate by weekday (Monday first); undefined with too few runs. */
export function paceByWeekday(sessions: Session[], since: string) {
  const days: number[][] = Array.from({ length: 7 }, () => []);
  for (const s of sessions) {
    if (s.date < since) continue;
    const eff = efficiency(s);
    if (eff !== undefined) days[weekday(s.date)]?.push(eff);
  }
  return days.map((effs) =>
    effs.length < 2
      ? undefined
      : paceAtReference(effs.reduce((a, b) => a + b, 0) / effs.length),
  );
}

// Below this many nights, HRV patterns are noise.
export const MIN_HRV_NIGHTS = 20;

/**
 * HRV nights paired with the training load of the day before. `correlation`
 * (Pearson, −1 to 1) only once there are `MIN_HRV_NIGHTS` nights.
 */
export function hrvAgainstLoad(
  hrv: HrvReading[],
  loadByDay: Map<string, number>,
  since: string,
) {
  const nights = hrv
    .filter((h) => h.date >= since)
    .map((h) => ({
      date: h.date,
      hrv: h.value,
      load: loadByDay.get(shiftDays(h.date, -1)) ?? 0,
    }));
  if (nights.length < MIN_HRV_NIGHTS) return { nights, correlation: undefined };
  const n = nights.length;
  const mx = nights.reduce((t, p) => t + p.load, 0) / n;
  const my = nights.reduce((t, p) => t + p.hrv, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const p of nights) {
    sxy += (p.load - mx) * (p.hrv - my);
    sxx += (p.load - mx) ** 2;
    syy += (p.hrv - my) ** 2;
  }
  const correlation = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
  return { nights, correlation };
}

/** Average HRV over nights in the 7 days to `today`, with how many nights it had. */
export function recentHrv(hrv: HrvReading[], today: string) {
  const from = shiftDays(today, -6);
  const week = hrv.filter((h) => h.date >= from && h.date <= today);
  const last = [...hrv].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  return {
    average: week.length
      ? week.reduce((t, h) => t + h.value, 0) / week.length
      : undefined,
    nights: week.length,
    last,
  };
}
