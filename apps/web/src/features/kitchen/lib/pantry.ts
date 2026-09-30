import {
  convertUnit,
  normalizeName,
  sameName,
  type GroceryItem,
  type MealItem,
  type PantryItem,
} from "@lifehub/shared";
import { formatAmount } from "./format";

export const isOut = (p: PantryItem) =>
  p.currentQuantity <= 0 && (p.extra ?? []).every((e) => e.quantity <= 0);

/** Out, or at or under the amount the person asked to be warned at. */
export const isLow = (p: PantryItem) =>
  isOut(p) || (p.lowAt !== undefined && p.currentQuantity <= p.lowAt);

/** Whether it's already on the list: waiting to be bought, in the cart, or not at all. */
export function listState(
  p: PantryItem,
  list: GroceryItem[],
): "list" | "cart" | null {
  const on = list.filter((g) => sameName(g.name, p.name));
  if (on.some((g) => !g.inCart)) return "list";
  return on.length ? "cart" : null;
}

/** The pantry item a meal line takes from: its linked row, or one with the same name. */
export const findPantryItem = (item: MealItem, pantry: PantryItem[]) =>
  (item.pantrySk ? pantry.find((p) => p.sk === item.pantrySk) : undefined) ??
  pantry.find((p) => sameName(p.name, item.name));

/** How much of the pantry item there is in the meal line's unit, or null if they don't convert. */
export function available(item: MealItem, p: PantryItem): number | null {
  const fromMain = convertUnit(p.currentQuantity, p.unit, item.unit);
  if (fromMain !== null) return fromMain;
  for (const e of p.extra ?? []) {
    const n = convertUnit(e.quantity, e.unit, item.unit);
    if (n !== null) return n;
  }
  return null;
}

export type MealLineState =
  | { kind: "untracked" }
  | { kind: "ok" | "short" | "out" | "mismatch"; text: string };

/** What a meal line will do to the pantry, in words for under its name. */
export function mealLineState(
  item: MealItem,
  pantry: PantryItem[],
): MealLineState {
  const p = findPantryItem(item, pantry);
  if (!p) {
    return item.pantrySk
      ? { kind: "out", text: "Not in the pantry, will skip" }
      : { kind: "untracked" };
  }
  const have = available(item, p);
  if (have === null)
    return { kind: "mismatch", text: "Units don't match, will skip" };
  if (have <= 0) return { kind: "out", text: "Out" };
  const text = `${formatAmount(Math.round(have * 100) / 100, item.unit)} in pantry`;
  return item.quantity > have
    ? { kind: "short", text: `Only ${text}` }
    : { kind: "ok", text };
}

/** Pantry items matching a search, by any word in the name. */
export const matches = (p: PantryItem, query: string) =>
  normalizeName(p.name).includes(normalizeName(query)) ||
  p.name.toLowerCase().includes(query.trim().toLowerCase());
