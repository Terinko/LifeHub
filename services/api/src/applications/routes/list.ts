import { json } from "../../shared/http";
import type { Route } from "../../shared/createHandler";
import { listApplications } from "../service";

export const list: Route = async ({ userId }) =>
  json(200, await listApplications(userId));
