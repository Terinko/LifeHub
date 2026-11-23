import type { Route } from "../../shared/createHandler";
import { json } from "../../shared/http";
import { connect, disconnect, getRunData } from "../service";

/** GET /run, or GET /run?refresh=1 to copy new runs from Garmin right away. */
export const runData: Route = async ({ userId, profile, query }) =>
  json(
    200,
    await getRunData(userId, profile, { refresh: query.refresh === "1" }),
  );

export const connectGarmin: Route = async ({ userId, profile }) =>
  json(200, await connect(userId, profile));

export const disconnectGarmin: Route = async ({ userId, profile }) =>
  json(200, await disconnect(userId, profile));
