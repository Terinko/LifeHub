import { createHandler } from "../shared/createHandler";
import { list } from "./routes/list";
import { remove } from "./routes/remove";
import { save } from "./routes/save";

// Admin-only tool: the role is re-checked server-side on every request.
export const handler = createHandler({
  name: "Applications",
  access: "admin",
  routes: {
    "GET /applications": list,
    "POST /applications": save,
    "DELETE /applications/{id}": remove,
  },
});
