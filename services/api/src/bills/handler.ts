import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { createHandler } from "../shared/createHandler";
import { list } from "./routes/list";
import { remove } from "./routes/remove";
import { create, replace } from "./routes/save";

// The Hub's summary peek (GET /bills?summary=1) doesn't count as opening Bills.
const countsAsUse = (event: APIGatewayProxyEventV2WithJWTAuthorizer) =>
  !(event.routeKey.startsWith("GET ") && event.queryStringParameters?.summary);

// Every signed-in user has their own bills, so there's no permission check.
export const handler = createHandler({
  name: "Bills",
  access: "user",
  usageAttribute: "lastUsedBills",
  countsAsUse,
  // Bad JSON gets Bills' own messages (and DELETE ignores the body).
  jsonBody: false,
  internalErrorMessage: "Something went wrong saving your bills. Try again.",
  routes: {
    "GET /bills": list,
    "GET /bills/{id}": list,
    "POST /bills": create,
    "PUT /bills": replace,
    "PUT /bills/{id}": replace,
    "DELETE /bills": remove,
    "DELETE /bills/{id}": remove,
  },
});
