import type { RunData } from "@lifehub/shared";
import { milesByDay, newestFirst } from "./days";
import { easyPaceByWeek } from "./easyPace";
import { EASY_HR, WEEKLY_GOAL_MI, YEARLY_GOAL_MI } from "./goals";
import {
  streakKpi,
  thisWeekKpi,
  trendStart,
  vo2Kpi,
  yearKpi,
  type Kpi,
} from "./kpis";
import { personalRecords } from "./records";
import { currentStreak, longestStreak } from "./streaks";
import { weeklyTotals, weeksAtGoal } from "./weeks";

/** Weeks of history on the easy-pace chart and the VO2 max comparison. */
export const TREND_WEEKS = 16;

/** Everything the page shows that doesn't depend on a control the user moves. */
export function buildDashboard(data: RunData, today: string) {
  const runs = data.activities.filter((r) => r.start.slice(0, 10) <= today);
  const days = milesByDay(runs);
  const kpis: Kpi[] = [
    thisWeekKpi(days, today, WEEKLY_GOAL_MI),
    yearKpi(days, today, YEARLY_GOAL_MI),
    streakKpi(days, today),
  ];
  const vo2 = vo2Kpi(data.vo2Max, trendStart(today, TREND_WEEKS));
  if (vo2) kpis.push(vo2);
  return {
    days,
    kpis,
    trendStart: trendStart(today, TREND_WEEKS),
    streak: currentStreak(days, today),
    longestStreak: longestStreak(days, `${today.slice(0, 4)}-01-01`, today),
    weeksAtGoal: weeksAtGoal(weeklyTotals(days, today, 52), WEEKLY_GOAL_MI),
    easyPace: easyPaceByWeek(runs, EASY_HR, today, TREND_WEEKS),
    records: personalRecords(runs),
    recent: newestFirst(runs).slice(0, 6),
  };
}

export type Dashboard = ReturnType<typeof buildDashboard>;
