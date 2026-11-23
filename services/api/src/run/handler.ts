import { createHandler } from "../shared/createHandler";
import * as routes from "./routes";

// Garmin's own pushes arrive at webhook.ts instead: they carry no Cognito token.
export const handler = createHandler({
  name: "Run",
  access: { permission: "run" },
  usageAttribute: "lastUsedRun",
  countsAsUse: (event) => event.routeKey === "GET /run",
  internalErrorMessage: "Couldn't load your runs from Garmin",
  routes: {
    "GET /run": routes.runData,
    "POST /run/garmin/connect": routes.connect,
    "POST /run/garmin/callback": routes.callback,
    "DELETE /run/garmin": routes.disconnectGarmin,
  },
});
