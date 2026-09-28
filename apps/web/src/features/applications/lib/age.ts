const DAY_MS = 24 * 60 * 60 * 1000;

/** Cards with no change for this many days get a "No update in…" nudge. */
export const STALE_DAYS = 14;

export function daysSince(isoDate: string, now: number = Date.now()): number {
  return Math.floor((now - new Date(isoDate).getTime()) / DAY_MS);
}

export function formatAge(isoDate: string, now: number = Date.now()): string {
  const days = daysSince(isoDate, now);
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function isStale(isoDate: string, now: number = Date.now()): boolean {
  return now - new Date(isoDate).getTime() > STALE_DAYS * DAY_MS;
}
