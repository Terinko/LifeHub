// Runs carry the local date they happened on ("YYYY-MM-DD"), so all calendar
// math here works on those keys at UTC noon, which is safe in any zone.

const MS_PER_DAY = 86_400_000;

/** "YYYY-MM-DD" → a UTC-noon Date. */
export const fromKey = (key: string) =>
  new Date(
    Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10), 12),
  );

export const toKey = (date: Date) => date.toISOString().slice(0, 10);

/** Today on this device's calendar as "YYYY-MM-DD". */
export const localToday = (now = new Date()) =>
  new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);

export const shiftDays = (key: string, days: number) =>
  toKey(new Date(fromKey(key).getTime() + days * MS_PER_DAY));

export const daysBetween = (from: string, to: string) =>
  Math.round((fromKey(to).getTime() - fromKey(from).getTime()) / MS_PER_DAY);

/** 0 for Monday … 6 for Sunday: training weeks start on Monday. */
export const weekday = (key: string) => (fromKey(key).getUTCDay() + 6) % 7;

/** The Monday of the week holding `key`. */
export const weekStart = (key: string) => shiftDays(key, -weekday(key));

/** ISO 8601 week number (weeks start Monday; week 1 holds the first Thursday). */
export function isoWeek(key: string): number {
  const thursday = shiftDays(key, 3 - weekday(key));
  const jan1 = `${thursday.slice(0, 4)}-01-01`;
  return Math.floor(daysBetween(jan1, thursday) / 7) + 1;
}

const format = (key: string, options: Intl.DateTimeFormatOptions) =>
  fromKey(key).toLocaleDateString("en-GB", { timeZone: "UTC", ...options });

/** "Nov 23" */
export const shortDate = (key: string) =>
  fromKey(key).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });

/** "Mon 23 Nov" */
export const dayDate = (key: string) =>
  format(key, { weekday: "short", day: "numeric", month: "short" }).replace(
    ",",
    "",
  );

/** "Mon 23 Nov 2026" */
export const fullDate = (key: string) =>
  format(key, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).replace(",", "");
