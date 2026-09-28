import { linkLeagueSchema, updateLeagueSchema } from "@lifehub/shared";
import type { Route } from "../../shared/createHandler";
import { badRequest, json } from "../../shared/http";
import {
  linkLeague,
  listLinkedLeagues,
  unlinkLeague,
  updateLeague,
} from "../service";

const leagueSk = (id: string | undefined) => {
  if (!id) throw badRequest("Missing league id");
  return decodeURIComponent(id);
};

export const list: Route = async ({ userId }) =>
  json(200, await listLinkedLeagues(userId));

export const link: Route = async ({ userId, body }) => {
  const parsed = linkLeagueSchema.safeParse(body ?? {});
  if (!parsed.success) {
    throw badRequest("Pick Sleeper or ESPN and fill in the league details.");
  }
  return json(200, await linkLeague(userId, parsed.data));
};

export const update: Route = async ({ userId, body, pathParameters }) => {
  const parsed = updateLeagueSchema.safeParse(body ?? {});
  if (!parsed.success) throw badRequest("Invalid league update");
  return json(
    200,
    await updateLeague(userId, leagueSk(pathParameters.id), parsed.data),
  );
};

export const unlink: Route = async ({ userId, pathParameters }) => {
  await unlinkLeague(userId, leagueSk(pathParameters.id));
  return json(200, { message: "Deleted" });
};
