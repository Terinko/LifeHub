import type { Route } from "../../shared/createHandler";
import { badRequest, json } from "../../shared/http";
import { buildGuide } from "../guide/buildGuide";
import { findSleeperLeagues } from "../service";

export const guide: Route = async ({ userId, query }) => {
  const week = Number(query.week) || undefined;
  return json(200, await buildGuide(userId, week));
};

export const sleeperLeagues: Route = async ({ query }) => {
  const username = query.username?.trim();
  if (!username) throw badRequest("Enter your Sleeper username");
  return json(200, await findSleeperLeagues(username));
};
