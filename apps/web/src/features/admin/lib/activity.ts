import type { UserProfile } from "@lifehub/shared";

const MINUTE = 60_000;
const WEEK = 7 * 24 * 60 * MINUTE;

/** "just now", "5m ago", "3h ago", "12d ago", then the date; "never" if unset. */
export function formatRelative(iso: string | undefined, now = Date.now()) {
  if (!iso) return "never";
  const mins = Math.floor((now - new Date(iso).getTime()) / MINUTE);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** How many users opened LifeHub in the last seven days. */
export const countActiveThisWeek = (users: UserProfile[], now = Date.now()) =>
  users.filter(
    (u) => u.lastActiveAt && now - new Date(u.lastActiveAt).getTime() < WEEK,
  ).length;

/** The per-tool "last used" stamps shown on each user card. */
export const TOOL_USAGE_FIELDS = [
  { key: "lastUsedBills", label: "Bills" },
  { key: "lastUsedKitchen", label: "Kitchen" },
  { key: "lastUsedPoker", label: "Poker" },
  { key: "lastUsedFantasy", label: "Fantasy" },
] as const satisfies { key: keyof UserProfile; label: string }[];
