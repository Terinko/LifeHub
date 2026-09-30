import { badRequest, HttpError, notFound } from "../shared/http";
import { unseenChangelog } from "./changelog";
import { createLogin, deleteLogin } from "./cognito";
import { newInvitee, newRootAdmin } from "./profiles";
import * as repo from "./repository";

/** Everything but the caller's own profile is admin only. */
export async function requireAdmin(userId: string): Promise<void> {
  const caller = await repo.getUser(repo.userKey(userId));
  if (caller?.role !== "ADMIN") throw new HttpError(403, "Admin only");
}

/**
 * The caller's own profile plus the "What's New" entries they haven't
 * seen. The very first sign-in (no profile yet) becomes the root admin.
 */
export async function getMe(userId: string, emailClaim: unknown) {
  const pk = repo.userKey(userId);
  const profile = await repo.getUser(pk);
  const now = new Date().toISOString();

  if (!profile) {
    const rootAdmin = newRootAdmin(pk, emailClaim, now);
    await repo.putUser(rootAdmin);
    return { ...rootAdmin, unseenChangelog: [] };
  }

  await repo
    .touchLastActive(pk, now)
    .catch((err) => console.error("Failed to record last active:", err));
  return {
    ...profile,
    lastActiveAt: now,
    unseenChangelog: unseenChangelog(profile),
  };
}

export async function markChangelogSeen(userId: string) {
  await repo.markChangelogSeen(repo.userKey(userId), new Date().toISOString());
  return { success: true };
}

/** Sends a Cognito invite and creates the profile with the chosen tools. */
export async function inviteUser({
  email,
  permissions,
}: Record<string, unknown>) {
  if (!email) throw badRequest("Email required");
  const sub = await createLogin(email as string);
  const profile = newInvitee(
    sub,
    email as string,
    permissions,
    new Date().toISOString(),
  );
  await repo.putUser(profile);
  return profile;
}

/** Replaces only the permissions, so the role can't be changed here. */
export async function updatePermissions({
  pk,
  permissions,
}: Record<string, unknown>) {
  const target = await repo.getUser(pk);
  if (!target) throw notFound("User not found");
  target.permissions = permissions as Record<string, unknown>;
  await repo.putUser(target);
  return { message: "Updated" };
}

export async function deleteUser(
  userId: string,
  { pk, email }: Record<string, unknown>,
) {
  if (pk === repo.userKey(userId)) throw badRequest("Cannot delete yourself");
  await deleteLogin(email as string);
  await repo.deleteUser(pk);
  return { message: "Deleted" };
}
