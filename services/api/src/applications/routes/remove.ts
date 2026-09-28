import { badRequest, json } from "../../shared/http";
import type { Route } from "../../shared/createHandler";
import { deleteApplication } from "../service";

export const remove: Route = async ({ userId, pathParameters }) => {
  const id = pathParameters.id;
  if (!id) throw badRequest("Missing application id");
  await deleteApplication(userId, decodeURIComponent(id));
  return json(200, { message: "Deleted" });
};
