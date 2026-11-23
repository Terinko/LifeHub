import { createHandler } from "../shared/createHandler";
import * as routes from "./routes";

export const handler = createHandler({
  name: "Run",
  access: { permission: "run" },
  usageAttribute: "lastUsedRun",
  countsAsUse: (event) => event.routeKey === "GET /run",
  internalErrorMessage: "Couldn't load your training from Garmin",
  routes: {
    "GET /run": routes.runData,
    "POST /run/garmin": routes.connectGarmin,
    "DELETE /run/garmin": routes.disconnectGarmin,
    "GET /run/garmin/check": routes.garminCheck,
  },
});
