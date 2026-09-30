import { createHandler } from "../shared/createHandler";
import { list } from "./routes/list";
import { post } from "./routes/post";
import { remove } from "./routes/remove";

// Everyone signed in has their own kitchen, so there's no permission check.
export const handler = createHandler({
  name: "Kitchen",
  access: "user",
  usageAttribute: "lastUsedKitchen",
  routes: {
    "GET /kitchen": list,
    "POST /kitchen": post,
    "DELETE /kitchen/{id}": remove,
  },
});
