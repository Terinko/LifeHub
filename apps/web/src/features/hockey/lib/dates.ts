// College hockey runs on Eastern time: a "day" of games is an Eastern day,
// and start times are shown in the viewer's own zone.
const ZONE = "America/New_York";

const easternParts = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

/** The Eastern calendar day of an instant, as YYYY-MM-DD. */
export const easternDate = (iso: string | Date) =>
  easternParts(typeof iso === "string" ? new Date(iso) : iso);

/** Today (Eastern) as the API's YYYYMMDD day key. */
export const todayKey = (now = new Date()) =>
  easternParts(now).replace(/-/g, "");

/** YYYYMMDD → a UTC-noon Date, safe for calendar math in any zone. */
const fromKey = (key: string) =>
  new Date(
    Date.UTC(+key.slice(0, 4), +key.slice(4, 6) - 1, +key.slice(6, 8), 12),
  );

const toKey = (date: Date) => date.toISOString().slice(0, 10).replace(/-/g, "");

export const shiftDay = (key: string, days: number) => {
  const d = fromKey(key);
  d.setUTCDate(d.getUTCDate() + days);
  return toKey(d);
};

/** "Today", "Yesterday", "Tomorrow" or "Fri, Oct 2". */
export function dayLabel(key: string, today = todayKey()): string {
  if (key === today) return "Today";
  if (key === shiftDay(today, -1)) return "Yesterday";
  if (key === shiftDay(today, 1)) return "Tomorrow";
  return fromKey(key).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "7:00 PM" in the viewer's zone. */
export const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

/** "Sat, Oct 3" in the viewer's zone. */
export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

/** Days, hours, minutes and seconds until `iso`, never negative. */
export function countdown(iso: string, now: number) {
  let s = Math.max(0, Math.floor((new Date(iso).getTime() - now) / 1000));
  const days = Math.floor(s / 86400);
  s -= days * 86400;
  const hours = Math.floor(s / 3600);
  s -= hours * 3600;
  const minutes = Math.floor(s / 60);
  return { days, hours, minutes, seconds: s - minutes * 60 };
}
