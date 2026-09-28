import { saveApplicationSchema, updateStatusSchema } from "@lifehub/shared";
import { badRequest, json } from "../../shared/http";
import type { Route } from "../../shared/createHandler";
import { saveApplication, updateStatus } from "../service";

const isStatusUpdate = (body: unknown) =>
  typeof body === "object" &&
  body !== null &&
  (body as { action?: unknown }).action === "UPDATE_STATUS";

/**
 * POST /applications does two things: the board's quick "Move to" status
 * change (an atomic single-field update) and create-or-replace of a card.
 */
export const save: Route = async ({ userId, body }) => {
  if (isStatusUpdate(body)) {
    const parsed = updateStatusSchema.safeParse(body);
    if (!parsed.success) throw badRequest("Invalid status update");
    return json(200, await updateStatus(userId, parsed.data));
  }

  const parsed = saveApplicationSchema.safeParse(body ?? {});
  if (!parsed.success) throw badRequest("Company and position are required");
  return json(200, await saveApplication(userId, parsed.data));
};
