import { json } from "../../shared/http";
import type { Route } from "../../shared/createHandler";
import * as repo from "../repository";

/** Removes a roster entry, or cancels or deletes a game. */
export const remove: Route = async ({ pathParameters }) => {
  await repo.deleteItem(decodeURIComponent(pathParameters.id as string));
  return json(200, { message: "Deleted" });
};
