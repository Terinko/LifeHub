import CHANGELOG from "./changelog.json";
import type { AdminUser } from "./repository";

export type ChangelogEntry = {
  id: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** Permissions the entry is about. Empty or missing: shown to everyone. */
  tools?: string[];
  bullets: string[];
};

/**
 * Anyone with an account before "What's New" shipped is treated as having
 * last seen it at this fixed point (the day before it went out), so the
 * entries dated on or after launch still surface once but nothing older
 * floods in as a backlog. New users start caught up.
 */
export const CHANGELOG_EPOCH = "2026-09-07T00:00:00.000Z";

const time = (date: string) => new Date(date).getTime();

/**
 * The entries the user hasn't dismissed yet, oldest first, limited to the
 * tools they can use (admins see everything).
 */
export function unseenChangelog(
  profile: AdminUser,
  entries: ChangelogEntry[] = CHANGELOG,
): ChangelogEntry[] {
  const lastSeen = profile.lastSeenChangelogAt || CHANGELOG_EPOCH;
  const isAdminRole = profile.role === "ADMIN";
  return entries
    .filter((entry) => new Date(entry.date) > new Date(lastSeen))
    .filter(
      (entry) =>
        isAdminRole ||
        !entry.tools ||
        entry.tools.length === 0 ||
        entry.tools.some((t) => profile.permissions?.[t]),
    )
    .sort((a, b) => time(a.date) - time(b.date));
}
