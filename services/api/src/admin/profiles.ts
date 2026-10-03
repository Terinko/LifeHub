import type { AdminUser } from "./repository";

/** The first person to sign in with no profile gets every tool. */
export const newRootAdmin = (
  pk: string,
  emailClaim: unknown,
  now: string,
): AdminUser => ({
  pk,
  email: (emailClaim as string) || "admin",
  role: "ADMIN",
  permissions: {
    bills: true,
    kitchen: true,
    poker: true,
    pokerStats: true,
    fantasy: true,
    weather: true,
    hockey: true,
  },
  createdAt: now,
  lastActiveAt: now,
  lastSeenChangelogAt: now,
});

/**
 * A friend invited from the admin page: no tools unless the admin picked
 * some. They start caught up on "What's New", since there's nothing for
 * them to have missed.
 */
export const newInvitee = (
  sub: string,
  email: string,
  permissions: unknown,
  now: string,
): AdminUser => ({
  pk: `USER#${sub}`,
  email,
  role: "USER",
  permissions: (permissions as Record<string, unknown>) || {
    bills: false,
    kitchen: false,
    poker: false,
    pokerStats: false,
    fantasy: false,
    weather: false,
    hockey: false,
  },
  createdAt: now,
  lastSeenChangelogAt: now,
});
