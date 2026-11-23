import {
  runGarminCallbackSchema,
  runGarminConnectSchema,
} from "@lifehub/shared";
import type { Route } from "../../shared/createHandler";
import { badRequest, json } from "../../shared/http";
import {
  disconnect,
  finishConnect,
  getRunData,
  startConnect,
} from "../service";

export const runData: Route = async ({ userId }) =>
  json(200, await getRunData(userId));

export const connect: Route = async ({ userId, body }) => {
  const parsed = runGarminConnectSchema.safeParse(body);
  if (!parsed.success) throw badRequest("redirectUri is required");
  return json(200, await startConnect(userId, parsed.data.redirectUri));
};

/** Garmin sent the browser back with a code: finish connecting, then return the runs. */
export const callback: Route = async ({ userId, body }) => {
  const parsed = runGarminCallbackSchema.safeParse(body);
  if (!parsed.success) throw badRequest("Invalid Garmin sign-in response");
  await finishConnect(userId, parsed.data);
  return json(200, await getRunData(userId));
};

export const disconnectGarmin: Route = async ({ userId }) => {
  await disconnect(userId);
  return json(200, await getRunData(userId));
};
