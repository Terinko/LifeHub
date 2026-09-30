import { createHandler } from "../shared/createHandler";
import { list, myStats, stats } from "./routes/read";
import { post } from "./routes/post";
import { remove } from "./routes/remove";

// Everyone with the poker permission shares one group. Hall of Fame stats
// need pokerStats on top (checked in the stats route and END_GAME).
export const handler = createHandler({
  name: "Poker",
  access: { permission: "poker" },
  usageAttribute: "lastUsedPoker",
  // POST parses its own body, so a bad one is a 500 as it always was.
  jsonBody: false,
  routes: {
    "GET /poker": list,
    "GET /poker/{id}": list,
    "GET /poker/stats": stats,
    "GET /poker/mystats": myStats,
    "POST /poker": post,
    "DELETE /poker/{id}": remove,
  },
});
