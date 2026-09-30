import { badRequest, json } from "../../shared/http";
import type { Route, RouteContext } from "../../shared/createHandler";
import { deleteBill } from "../service";

/**
 * The id can come from ?id= or ?billId= (what the screen sends), the path,
 * or the body. The strings "undefined" and "null" count as missing.
 */
export function billIdFrom({
  query,
  pathParameters,
  event,
}: Pick<RouteContext, "query" | "pathParameters" | "event">): unknown {
  let id: unknown = query.id || query.billId || pathParameters.id;
  if (!id && event.body) {
    try {
      const body = JSON.parse(event.body);
      id = body.id || body.billId || body.sk;
    } catch {
      // No usable body; fall through to the missing-id reply.
    }
  }
  return id && id !== "undefined" && id !== "null" ? id : null;
}

export const remove: Route = async (ctx) => {
  const id = billIdFrom(ctx);
  if (!id) throw badRequest("Which bill? The id is missing.");
  await deleteBill(ctx.userId, id as string);
  return json(200, { message: "Bill deleted", id });
};
