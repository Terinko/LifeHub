import {
  logMealSchema,
  parseIngredientsSchema,
  putAwaySchema,
  restoreSchema,
  saveKitchenItemSchema,
} from "@lifehub/shared";
import type { z } from "zod";
import { badRequest, json } from "../../shared/http";
import type { Route } from "../../shared/createHandler";
import { parseIngredients } from "../gemini";
import { logMeal, putAway, restore, saveItem } from "../service";

function parse<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw badRequest(
      result.error.issues[0]?.message ?? "That doesn't look right.",
    );
  }
  return result.data;
}

const actionOf = (body: unknown) =>
  typeof body === "object" && body !== null
    ? (body as { action?: unknown }).action
    : undefined;

/**
 * POST /kitchen: an action (put away, log a meal, read a pasted list,
 * restore for Undo) or, with no action, create-or-replace of one item.
 */
export const post: Route = async ({ userId, body }) => {
  switch (actionOf(body)) {
    case "PUT_AWAY": {
      const { sks } = parse(putAwaySchema, body);
      return json(200, await putAway(userId, sks));
    }
    // Older app versions put one item away at a time.
    case "PURCHASE_GROCERY": {
      const sk = (body as { item?: { sk?: unknown } }).item?.sk;
      if (typeof sk !== "string")
        throw badRequest("Which item? The id is missing.");
      const { pantryItems } = await putAway(userId, [sk]);
      return json(200, { success: true, pantryItem: pantryItems[0] });
    }
    case "LOG_QUICK_MEAL": {
      const { items } = parse(logMealSchema, body);
      return json(200, { success: true, ...(await logMeal(userId, items)) });
    }
    case "PARSE_INGREDIENTS": {
      const { ingredientsText } = parse(parseIngredientsSchema, body);
      return json(200, {
        ingredients: await parseIngredients(ingredientsText),
      });
    }
    case "RESTORE": {
      const { put, remove } = parse(restoreSchema, body);
      const items = put.map((p) => {
        if (!p.sk) throw badRequest("Can only restore saved items.");
        return { ...p, sk: p.sk };
      });
      return json(200, await restore(userId, items, remove));
    }
    case undefined: {
      // Older app versions left pk off list items.
      const withType = { pk: "GROCERY", ...(body as object) };
      return json(
        200,
        await saveItem(userId, parse(saveKitchenItemSchema, withType)),
      );
    }
    default:
      throw badRequest("Unknown kitchen action.");
  }
};
