import { createHandler } from "../shared/createHandler";
import * as routes from "./routes";

// Recent sold listings from Poshmark's search page. Each lookup counts
// against a daily allowance per person.
export const handler = createHandler({
  name: "Thrift",
  access: { permission: "thrift" },
  usageAttribute: "lastUsedThrift",
  countsAsUse: (event) => event.routeKey === "POST /thrift/lookup",
  internalErrorMessage: "Couldn't reach Poshmark",
  routes: { "POST /thrift/lookup": routes.lookup },
});
