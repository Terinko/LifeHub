import { json } from "../../shared/http";
import type { Route } from "../../shared/createHandler";
import { getMe, markChangelogSeen } from "../service";

/** GET /admin/users?me=true: any signed-in user's own profile (the Hub). */
export const me: Route = async ({ userId, event }) =>
  json(
    200,
    await getMe(userId, event.requestContext.authorizer?.jwt?.claims?.email),
  );

/** POST /admin/changelog-seen: dismisses the "What's New" popup. */
export const changelogSeen: Route = async ({ userId }) =>
  json(200, await markChangelogSeen(userId));
