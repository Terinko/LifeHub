import type { RunVo2Reading } from "@lifehub/shared";
import { daysBetween, shiftDays, shortDate, weekday, weekStart } from "./dates";
import { milesBetween } from "./days";
import { currentStreak, longestStreak } from "./streaks";
import { formatMiles } from "./units";

export type PillTone = "neutral" | "good" | "behind" | "info";

export type Kpi = {
  label: string;
  value: string;
  unit: string;
  /** 0–100, how full the bar under the number is. */
  percent: number;
  pill: string;
  tone: PillTone;
  note: string;
};

const clampPercent = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function thisWeekKpi(
  days: Map<string, number>,
  today: string,
  goal: number,
): Kpi {
  const miles = milesBetween(days, weekStart(today), today);
  const day = weekday(today) + 1;
  const left = goal - miles;
  const perDay = left / (8 - day);
  return {
    label: "This week",
    value: formatMiles(miles),
    unit: `/ ${goal} mi`,
    percent: clampPercent((miles / goal) * 100),
    pill: left <= 0 ? "Goal hit" : `Day ${day} of 7`,
    tone: left <= 0 ? "good" : "neutral",
    note:
      left <= 0
        ? `${formatMiles(-left)} mi past your goal`
        : `${formatMiles(left)} mi to go · about ${formatMiles(perDay)} mi/day`,
  };
}

export function yearKpi(
  days: Map<string, number>,
  today: string,
  goal: number,
): Kpi {
  const jan1 = `${today.slice(0, 4)}-01-01`;
  const yearDays = daysBetween(jan1, `${+today.slice(0, 4) + 1}-01-01`);
  const miles = milesBetween(days, jan1, today);
  const onPace = (goal * (daysBetween(jan1, today) + 1)) / yearDays;
  const ahead = miles - onPace;
  return {
    label: "Year to date",
    value: formatMiles(miles),
    unit: `/ ${goal.toLocaleString("en-US")} mi`,
    percent: clampPercent((miles / goal) * 100),
    pill: ahead >= 0 ? "Ahead" : "Behind",
    tone: ahead >= 0 ? "good" : "behind",
    note: `${formatMiles(Math.abs(ahead))} mi ${ahead >= 0 ? "ahead of" : "behind"} goal pace`,
  };
}

export function streakKpi(days: Map<string, number>, today: string): Kpi {
  const streak = currentStreak(days, today);
  const longest = longestStreak(days, `${today.slice(0, 4)}-01-01`, today);
  return {
    label: "Run streak",
    value: String(streak),
    unit: streak === 1 ? "day" : "days",
    percent: longest ? clampPercent((streak / longest) * 100) : 0,
    pill: streak > 0 ? "Active" : "Run today",
    tone: streak > 0 ? "good" : "neutral",
    note: `Longest this year: ${longest} ${longest === 1 ? "day" : "days"}`,
  };
}

// The VO2 max bar is drawn against a well-trained recreational ceiling.
const VO2_SCALE = 65;

/** `since` is how far back to compare, e.g. the first day on the pace chart. */
export function vo2Kpi(
  readings: RunVo2Reading[],
  since: string,
): Kpi | undefined {
  const sorted = [...readings].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted.at(-1);
  if (!latest) return undefined;
  const before = [...sorted].reverse().find((r) => r.date <= since) ?? latest;
  const change = latest.value - before.value;
  const month = shortDate(before.date).split(" ")[0];
  return {
    label: "VO₂ max",
    value: String(latest.value),
    unit: "ml/kg/min",
    percent: clampPercent((latest.value / VO2_SCALE) * 100),
    pill:
      change === 0
        ? `Same as ${month}`
        : `${change > 0 ? "+" : "−"}${Math.abs(change)} since ${month}`,
    tone: "info",
    note: "From Garmin, updated after each run",
  };
}

/** The day `weeks` weeks before this week began: where trend comparisons start. */
export const trendStart = (today: string, weeks: number) =>
  shiftDays(weekStart(today), -(weeks - 1) * 7);
