import { createHandler } from "../shared/createHandler";
import * as routes from "./routes";

// Everything here is public sports data, read from ESPN, NCAA.com, College
// Hockey News and Quinnipiac's athletics site; the tool permission only
// decides who sees the tile.
export const handler = createHandler({
  name: "Hockey",
  access: { permission: "hockey" },
  usageAttribute: "lastUsedHockey",
  // Scores poll every 30 seconds during games; the team schedule loads once
  // when the tool opens, so it's the one that counts as a use.
  countsAsUse: (event) => event.routeKey === "GET /hockey/teams/{id}",
  internalErrorMessage: "Couldn't reach the hockey data sources",
  routes: {
    "GET /hockey/scores": routes.scores,
    "GET /hockey/poll": routes.poll,
    "GET /hockey/npi": routes.npi,
    "GET /hockey/standings/{conference}": routes.standings,
    "GET /hockey/teams": routes.teams,
    "GET /hockey/teams/{id}": routes.team,
    "GET /hockey/box": routes.box,
  },
});
