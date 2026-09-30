import { randomUUID } from "node:crypto";
import {
  sameName,
  type GroceryItem,
  type KitchenItem,
  type KitchenType,
  type LogMealResult,
  type MealItem,
  type PantryItem,
  type PutAwayResult,
  type QuickMeal,
  type SkippedMealItem,
} from "@lifehub/shared";
import { addAmount, takeAmount, type Amounts } from "./quantities";
import * as repo from "./repository";

export async function listKitchen(userId: string): Promise<KitchenItem[]> {
  const [groceries, pantry, meals] = await Promise.all([
    repo.listType<GroceryItem>(userId, "GROCERY"),
    repo.listType<PantryItem>(userId, "INVENTORY"),
    repo.listType<QuickMeal>(userId, "QUICKMEAL"),
  ]);
  return [...groceries, ...pantry, ...meals];
}

const pantryAmounts = (p: PantryItem): Amounts => ({
  main: Number(p.currentQuantity) || 0,
  unit: p.unit ?? "",
  extra: p.extra ?? [],
});

const groceryAmounts = (g: GroceryItem): Amounts => ({
  main: Number(g.quantity) || 0,
  unit: g.unit ?? "",
  extra: g.extra ?? [],
});

const withExtra = <T extends { extra?: Amounts["extra"] }>(
  item: T,
  extra: Amounts["extra"],
): T => {
  const next = { ...item };
  if (extra.length) next.extra = extra;
  else delete next.extra;
  return next;
};

/** Adds every amount of `add` (main and extras) into `into`. */
function combine(into: Amounts, add: Amounts): Amounts {
  let total = addAmount(into, add.main, add.unit);
  for (const e of add.extra) total = addAmount(total, e.quantity, e.unit);
  return total;
}

export type NewItem = (
  Omit<GroceryItem, "sk"> | Omit<PantryItem, "sk"> | Omit<QuickMeal, "sk">
) & { sk?: string };

/**
 * Saves one item. With an sk it replaces that item exactly (edits, Undo).
 * Without one, a list or pantry item with the same name gets the amount
 * added to it instead of a second row.
 */
export async function saveItem(
  userId: string,
  input: NewItem,
): Promise<KitchenItem> {
  if (input.sk) {
    const item = input as KitchenItem;
    await repo.putItem(userId, item);
    return item;
  }
  const fresh = { ...input, sk: randomUUID() } as KitchenItem;
  if (fresh.pk === "QUICKMEAL") {
    await repo.putItem(userId, fresh);
    return fresh;
  }
  const merged =
    fresh.pk === "GROCERY"
      ? await mergeGrocery(userId, fresh)
      : await mergePantry(userId, fresh);
  await repo.putItem(userId, merged);
  return merged;
}

async function mergeGrocery(userId: string, item: GroceryItem) {
  const list = await repo.listType<GroceryItem>(userId, "GROCERY");
  // Something already in the cart is a separate trip's worth.
  const match = list.find((g) => !g.inCart && sameName(g.name, item.name));
  if (!match) return item;
  const total = combine(groceryAmounts(match), groceryAmounts(item));
  return withExtra({ ...match, quantity: total.main }, total.extra);
}

async function mergePantry(userId: string, item: PantryItem) {
  const pantry = await repo.listType<PantryItem>(userId, "INVENTORY");
  const match = pantry.find((p) => sameName(p.name, item.name));
  if (!match) return item;
  const total = combine(pantryAmounts(match), pantryAmounts(item));
  return withExtra({ ...match, currentQuantity: total.main }, total.extra);
}

/**
 * Moves list items into the pantry: each adds to the pantry item with the
 * same name (every amount, extras too) or becomes a new one, and leaves
 * the list.
 */
export async function putAway(
  userId: string,
  sks: string[],
): Promise<PutAwayResult> {
  const [list, pantry] = await Promise.all([
    repo.listType<GroceryItem>(userId, "GROCERY"),
    repo.listType<PantryItem>(userId, "INVENTORY"),
  ]);
  const bySk = new Map(pantry.map((p) => [p.sk, p]));
  const touched = new Set<string>();
  const removed: string[] = [];

  for (const sk of sks) {
    const g = list.find((i) => i.sk === sk);
    if (!g) continue;
    removed.push(sk);
    const match = [...bySk.values()].find((p) => sameName(p.name, g.name));
    const next: PantryItem = match
      ? (() => {
          const total = combine(pantryAmounts(match), groceryAmounts(g));
          return withExtra<PantryItem>(
            { ...match, currentQuantity: total.main },
            total.extra,
          );
        })()
      : withExtra<PantryItem>(
          {
            pk: "INVENTORY",
            sk: g.sk,
            name: g.name,
            currentQuantity: Number(g.quantity) || 0,
            unit: g.unit ?? "",
          },
          g.extra ?? [],
        );
    bySk.set(next.sk, next);
    touched.add(next.sk);
  }

  const pantryItems = [...touched].map((sk) => bySk.get(sk) as PantryItem);
  await repo.writeAll(userId, [
    ...pantryItems.map((put) => ({ put })),
    ...removed.map((sk) => ({ remove: { pk: "GROCERY" as const, sk } })),
  ]);
  return { pantryItems, removed };
}

/**
 * Takes a meal's amounts out of the pantry, never below 0. Lines the pantry
 * doesn't have, or whose units don't convert (slices from a loaf), are left
 * alone and returned in `skipped` so the app can say so.
 */
export async function logMeal(
  userId: string,
  items: MealItem[],
): Promise<LogMealResult> {
  const pantry = await repo.listType<PantryItem>(userId, "INVENTORY");
  const bySk = new Map(pantry.map((p) => [p.sk, p]));
  const touched = new Set<string>();
  const skipped: SkippedMealItem[] = [];

  for (const used of items) {
    if (!(used.quantity > 0)) continue;
    // The pantry row may have been renamed or re-added since the meal was built.
    const match =
      (used.pantrySk ? bySk.get(used.pantrySk) : undefined) ??
      [...bySk.values()].find((p) => sameName(p.name, used.name));
    if (!match) {
      if (used.pantrySk)
        skipped.push({ name: used.name, reason: "not-in-pantry" });
      continue;
    }
    const left = takeAmount(pantryAmounts(match), used.quantity, used.unit);
    if (!left) {
      skipped.push({ name: used.name, reason: "units-differ" });
      continue;
    }
    bySk.set(
      match.sk,
      withExtra({ ...match, currentQuantity: left.main }, left.extra),
    );
    touched.add(match.sk);
  }

  const pantryItems = [...touched].map((sk) => bySk.get(sk) as PantryItem);
  await repo.writeAll(
    userId,
    pantryItems.map((put) => ({ put })),
  );
  return { pantryItems, skipped };
}

/** Undo: puts items back exactly as they were and removes the ones that were added. */
export async function restore(
  userId: string,
  put: KitchenItem[],
  remove: { pk: KitchenType; sk: string }[],
) {
  await repo.writeAll(userId, [
    ...put.map((p) => ({ put: p })),
    ...remove.map((r) => ({ remove: r })),
  ]);
  return { success: true };
}

export const deleteItem = repo.deleteItem;
