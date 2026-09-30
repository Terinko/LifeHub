import { badRequest, json } from "../../shared/http";
import type { Route, RouteContext } from "../../shared/createHandler";
import { saveBill } from "../service";
import { validateBill } from "../validateBill";

function readBill(raw: string | undefined): unknown {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    throw badRequest("Send the bill as JSON.");
  }
}

/** POST creates (201), PUT replaces (200); both upsert by id. */
const save =
  (statusCode: number): Route =>
  async ({ userId, pathParameters, event }: RouteContext) => {
    const body = readBill(event.body);
    const problem = validateBill(body);
    if (problem) throw badRequest(problem);
    const bill = await saveBill(
      userId,
      body as Record<string, unknown>,
      pathParameters.id,
    );
    return json(statusCode, bill);
  };

export const create = save(201);
export const replace = save(200);
