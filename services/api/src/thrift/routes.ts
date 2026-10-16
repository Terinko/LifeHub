import { thriftLookupSchema } from "@lifehub/shared";
import type { Route } from "../shared/createHandler";
import { badRequest, json } from "../shared/http";
import { lookup as runLookup } from "./service";

/** POST /thrift/lookup: recent Poshmark sales for an item. */
export const lookup: Route = async ({ userId, body }) => {
  const input = thriftLookupSchema.safeParse(body);
  if (!input.success) {
    throw badRequest(
      input.error.issues[0]?.message ?? "That doesn't look right.",
    );
  }
  return json(200, await runLookup(userId, input.data));
};
