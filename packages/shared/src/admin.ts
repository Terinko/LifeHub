/** The tools an admin can grant, keyed as in a user's `permissions`. */
export const TOOL_PERMISSIONS = [
  "bills",
  "kitchen",
  "poker",
  "pokerStats",
  "fantasy",
  "weather",
] as const;
export type ToolPermission = (typeof TOOL_PERMISSIONS)[number];

/** Which tools a user may open. Older profiles can miss keys. */
export type ToolPermissions = Partial<Record<ToolPermission, boolean>>;

export type UserRole = "ADMIN" | "USER";

/** A LifeHub user as stored in the Users table (GET /admin/users). */
export type UserProfile = {
  /** "USER#<cognito sub>" */
  pk: string;
  email?: string;
  role?: UserRole;
  permissions?: ToolPermissions;
  createdAt?: string;
  lastActiveAt?: string;
  lastSeenChangelogAt?: string;
  lastUsedBills?: string;
  lastUsedKitchen?: string;
  lastUsedPoker?: string;
  lastUsedFantasy?: string;
};

/** One "What's New" entry (backend/lambda/admin/changelog.json). */
export type ChangelogEntry = {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** Tool keys it is about; empty or missing means everyone. */
  tools?: string[];
  bullets: string[];
};

/** GET /admin/users?me=true: the caller's profile and what they haven't seen. */
export type MyProfile = UserProfile & {
  unseenChangelog?: ChangelogEntry[];
};

/** Body of POST /admin/users: invite someone by email. */
export type InviteUserInput = {
  email: string;
  permissions: Record<ToolPermission, boolean>;
};

/** Body of DELETE /admin/users. */
export type DeleteUserInput = { pk: string; email?: string };
