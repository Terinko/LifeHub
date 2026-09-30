import { KITCHEN_TYPES, type KitchenType } from "@lifehub/shared";
import { badRequest, json } from "../../shared/http";
import type { Route } from "../../shared/createHandler";
import { deleteItem } from "../service";

const isType = (t: string): t is KitchenType =>
  (KITCHEN_TYPES as readonly string[]).includes(t);

/** DELETE /kitchen/{id}?pk=GROCERY|INVENTORY|QUICKMEAL (GROCERY when left out). */
export const remove: Route = async ({ userId, pathParameters, query }) => {
  const sk = pathParameters.id;
  if (!sk) throw badRequest("Which item? The id is missing.");
  // Older app versions sent the stored key, "USER#<id>#GROCERY".
  const type = (query.pk ?? "GROCERY").replace(/^USER#[^#]+#/, "");
  if (!isType(type)) throw badRequest("Unknown kind of kitchen item.");
  await deleteItem(userId, type, decodeURIComponent(sk));
  return json(200, { message: "Deleted" });
};
