import { json, parseBodyStrictly } from "../../shared/http";
import type { Route } from "../../shared/createHandler";
import * as repo from "../repository";
import {
  deleteUser,
  inviteUser,
  requireAdmin,
  updatePermissions,
} from "../service";
import { me } from "./me";

type Body = Record<string, unknown>;

/** GET /admin/users: everyone (admins), or ?me=true for your own profile. */
export const list: Route = async (ctx) => {
  if (ctx.query.me === "true") return me(ctx);
  await requireAdmin(ctx.userId);
  return json(200, await repo.listUsers());
};

export const invite: Route = async ({ userId, event }) => {
  await requireAdmin(userId);
  return json(200, await inviteUser(parseBodyStrictly(event.body) as Body));
};

export const update: Route = async ({ userId, event }) => {
  await requireAdmin(userId);
  return json(
    200,
    await updatePermissions(parseBodyStrictly(event.body) as Body),
  );
};

export const remove: Route = async ({ userId, event }) => {
  await requireAdmin(userId);
  return json(
    200,
    await deleteUser(userId, parseBodyStrictly(event.body) as Body),
  );
};
