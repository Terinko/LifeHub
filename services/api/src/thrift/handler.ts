import { createHandler } from "../shared/createHandler";
import * as routes from "./routes";

// Live eBay listings (Browse API) and the group's own sold-price checks.
// Each lookup counts against a daily allowance per person.
export const handler = createHandler({
  name: "Thrift",
  access: { permission: "thrift" },
  usageAttribute: "lastUsedThrift",
  countsAsUse: (event) => event.routeKey === "POST /thrift/lookup",
  internalErrorMessage: "Couldn't reach eBay",
  routes: {
    "POST /thrift/lookup": routes.lookup,
    "POST /thrift/sales": routes.sales,
  },
});
