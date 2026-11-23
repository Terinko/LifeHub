import { shiftDays } from "./dates";

/**
 * Days in a row with a run, ending today, or yesterday when today's run
 * hasn't happened yet (the streak is still alive until the day is over).
 */
export function currentStreak(days: Map<string, number>, today: string) {
  let day = days.has(today) ? today : shiftDays(today, -1);
  let streak = 0;
  while (days.has(day)) {
    streak += 1;
    day = shiftDays(day, -1);
  }
  return streak;
}

/** The longest run of consecutive run days between `from` and `to`. */
export function longestStreak(
  days: Map<string, number>,
  from: string,
  to: string,
) {
  let best = 0;
  let current = 0;
  for (let day = from; day <= to; day = shiftDays(day, 1)) {
    current = days.has(day) ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return best;
}
