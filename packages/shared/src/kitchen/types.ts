import { z } from "zod";

export const KITCHEN_TYPES = ["GROCERY", "INVENTORY", "QUICKMEAL"] as const;
export type KitchenType = (typeof KITCHEN_TYPES)[number];

export const PANTRY_LOCATIONS = ["fridge", "freezer", "shelf"] as const;
export type PantryLocation = (typeof PANTRY_LOCATIONS)[number];

/** An amount that couldn't be folded into an item's main one, like "+ 1 bag". */
export type ExtraQuantity = { quantity: number; unit: string };

/** On the shopping list. `inCart` means checked off but not put away yet. */
export type GroceryItem = {
  pk: "GROCERY";
  sk: string;
  name: string;
  quantity: number;
  unit: string;
  extra?: ExtraQuantity[];
  inCart?: boolean;
};

/** In the pantry. `lowAt` is the amount at or under which it counts as running low. */
export type PantryItem = {
  pk: "INVENTORY";
  sk: string;
  name: string;
  currentQuantity: number;
  unit: string;
  extra?: ExtraQuantity[];
  location?: PantryLocation;
  lowAt?: number;
};

/** One line of a quick meal. `pantrySk` is null for things the pantry doesn't track. */
export type MealItem = {
  pantrySk: string | null;
  name: string;
  quantity: number;
  unit: string;
};

export type QuickMeal = {
  pk: "QUICKMEAL";
  sk: string;
  name: string;
  items: MealItem[];
};

export type KitchenItem = GroceryItem | PantryItem | QuickMeal;

const amount = z.coerce.number().finite().min(0).max(1_000_000);
const unit = z
  .string()
  .max(40)
  .nullish()
  .transform((u) => (u ?? "").trim());
const name = z.string().trim().min(1, "Give it a name.").max(100);
const sk = z.string().min(1).max(100);

const extraSchema = z.object({ quantity: amount, unit });

export const grocerySchema = z.object({
  pk: z.literal("GROCERY"),
  sk: sk.optional(),
  name,
  quantity: amount.default(1),
  unit,
  extra: z.array(extraSchema).max(10).optional(),
  inCart: z.boolean().optional(),
});

export const pantrySchema = z.object({
  pk: z.literal("INVENTORY"),
  sk: sk.optional(),
  name,
  currentQuantity: amount.default(1),
  unit,
  extra: z.array(extraSchema).max(10).optional(),
  location: z.enum(PANTRY_LOCATIONS).optional(),
  lowAt: amount.optional(),
});

export const mealItemSchema = z.object({
  pantrySk: z.string().max(100).nullable().default(null),
  name,
  quantity: amount.default(0),
  unit,
});

export const quickMealSchema = z.object({
  pk: z.literal("QUICKMEAL"),
  sk: sk.optional(),
  name,
  items: z.array(mealItemSchema).min(1, "Add at least one item.").max(50),
});

/** Body of a plain POST /kitchen: create (no sk) or replace (sk) one item. */
export const saveKitchenItemSchema = z.discriminatedUnion("pk", [
  grocerySchema,
  pantrySchema,
  quickMealSchema,
]);
export type SaveKitchenItem = z.input<typeof saveKitchenItemSchema>;

export const putAwaySchema = z.object({
  action: z.literal("PUT_AWAY"),
  sks: z.array(sk).min(1).max(200),
});

export const logMealSchema = z.object({
  action: z.literal("LOG_QUICK_MEAL"),
  items: z.array(mealItemSchema).max(50),
});

export const parseIngredientsSchema = z.object({
  action: z.literal("PARSE_INGREDIENTS"),
  ingredientsText: z.string().trim().min(1).max(4000),
});

const keySchema = z.object({ pk: z.enum(KITCHEN_TYPES), sk });

/** Puts items back exactly as they were and removes others: how Undo works. */
export const restoreSchema = z.object({
  action: z.literal("RESTORE"),
  put: z.array(saveKitchenItemSchema).max(200).default([]),
  remove: z.array(keySchema).max(200).default([]),
});

export type PutAwayResult = { pantryItems: PantryItem[]; removed: string[] };

/** Why a meal line didn't change the pantry. */
export type SkippedMealItem = {
  name: string;
  reason: "not-in-pantry" | "units-differ";
};

export type LogMealResult = {
  pantryItems: PantryItem[];
  skipped: SkippedMealItem[];
};

export type ParsedIngredient = {
  name: string;
  quantity?: number;
  unit?: string;
};
