import type { RunData } from "@lifehub/shared";
import { shiftDays, weekStart } from "./dates";
import { milesBetween, milesByDay, newestFirst } from "./days";
import { easyPaceByWeek, type PacePoint } from "./easyPace";
import {
  adherenceByWeek,
  dayBeforeEffect,
  hrvAgainstLoad,
  paceByWeekday,
  recentHrv,
  timeByWeek,
} from "./insights";
import {
  lastSession,
  liftRecords,
  maxTrend,
  setsPerMuscle,
  volumeTrend,
} from "./lifting";
import { loadByDay, ratioByWeek } from "./load";
import { personalRecords } from "./records";
import { walkRotation } from "./rotation";
import {
  averageWeek,
  effortRecords,
  intensityMix,
  longestRun,
  racePredictions,
} from "./running";
import { allSessions } from "./sessions";
import { EASY_HR, TRACKED_LIFTS, TREND_WEEKS } from "./settings";
import { recentDays, weekVsLast } from "./week";

/** The first day on the trend charts: `weeks` weeks back from this week. */
export const trendStart = (today: string, weeks = TREND_WEEKS) =>
  shiftDays(weekStart(today), -(weeks - 1) * 7);

/** Everything the four tabs show that doesn't depend on a control the user moves. */
export function buildDashboard(data: RunData, today: string) {
  const sessions = allSessions(data, today);
  const runs = sessions.flatMap((s) => (s.run ? [s.run] : []));
  const lifts = sessions.flatMap((s) => (s.lift ? [s.lift] : []));
  const days = milesByDay(runs);
  const loads = loadByDay(sessions);
  const since = trendStart(today);
  const rotation = walkRotation(sessions);
  const easyPace: PacePoint[] = easyPaceByWeek(
    runs,
    EASY_HR,
    today,
    TREND_WEEKS,
  );
  const jan1 = `${today.slice(0, 4)}-01-01`;
  const races = racePredictions(data.vo2Max, since);
  return {
    sessions,
    week: {
      rotation,
      strip: recentDays(sessions, today),
      ratio: ratioByWeek(loads, today, 12),
      compare: weekVsLast(sessions, today),
      hrv: recentHrv(data.hrv, today),
    },
    progression: {
      easyPace,
      half: races.find((r) => r.label === "Half marathon"),
      bench: maxTrend(lifts, "Bench press").filter((p) => p.date >= since),
      row: maxTrend(lifts, "Row").filter((p) => p.date >= since),
    },
    running: {
      days,
      yearMiles: milesBetween(days, jan1, today),
      averageWeek: averageWeek(days, today),
      longestRun: longestRun(runs, today),
      vo2: [...data.vo2Max].sort((a, b) => a.date.localeCompare(b.date)),
      easyPace,
      mix: intensityMix(runs, today, 8),
      races,
      records: effortRecords(runs, personalRecords(runs)),
      recent: newestFirst(runs).slice(0, 8),
    },
    lifting: {
      lifts,
      sets: setsPerMuscle(lifts, weekStart(today), today),
      maxes: TRACKED_LIFTS.map((exercise) => ({
        exercise,
        points: maxTrend(lifts, exercise).filter((p) => p.date >= since),
      })),
      volume: {
        back: volumeTrend(lifts, "back"),
        chest: volumeTrend(lifts, "chest"),
      },
      last: lastSession(lifts),
      records: liftRecords(lifts, TRACKED_LIFTS),
      withoutSets: lifts.filter((l) => !l.sets?.length).length,
    },
    insights: {
      dayBefore: dayBeforeEffect(sessions, shiftDays(today, -180)),
      time: timeByWeek(sessions, today, 12),
      adherence: adherenceByWeek(rotation.entries, today, 8),
      weekdays: paceByWeekday(sessions, shiftDays(today, -180)),
      hrv: hrvAgainstLoad(data.hrv, loads, shiftDays(today, -90)),
    },
  };
}

export type Dashboard = ReturnType<typeof buildDashboard>;
