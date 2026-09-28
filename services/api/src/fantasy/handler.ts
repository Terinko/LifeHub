import { createHandler } from "../shared/createHandler";
import { guide, sleeperLeagues } from "./routes/guide";
import { link, list, unlink, update } from "./routes/leagues";

export const handler = createHandler({
  name: "Fantasy",
  access: { permission: "fantasy" },
  usageAttribute: "lastUsedFantasy",
  routes: {
    "GET /fantasy/leagues": list,
    "POST /fantasy/leagues": link,
    "PUT /fantasy/leagues/{id}": update,
    "DELETE /fantasy/leagues/{id}": unlink,
    "GET /fantasy/guide": guide,
    "GET /fantasy/sleeper-leagues": sleeperLeagues,
  },
});
