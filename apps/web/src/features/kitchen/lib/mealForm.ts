import {
  sameName,
  type MealItem,
  type PantryItem,
  type ParsedIngredient,
  type SaveKitchenItem,
} from "@lifehub/shared";

/** A meal line while it's being edited: the amount stays text until saved. */
export type MealRow = Omit<MealItem, "quantity"> & { quantity: string };

export const rowFrom = (item: MealItem): MealRow => ({
  ...item,
  quantity: String(item.quantity),
});

export const rowFromPantry = (p: PantryItem): MealRow => ({
  pantrySk: p.sk,
  name: p.name,
  quantity: "1",
  unit: p.unit,
});

/** Rows from a read list, linked to the pantry item with the same name when there is one. */
export const rowsFromParsed = (
  parsed: ParsedIngredient[],
  pantry: PantryItem[],
): MealRow[] =>
  parsed.map((ing) => {
    const match = pantry.find((p) => sameName(p.name, ing.name));
    return {
      pantrySk: match?.sk ?? null,
      name: match?.name ?? ing.name,
      quantity: String(ing.quantity ?? 0),
      unit: ing.unit ?? match?.unit ?? "",
    };
  });

/** The meal to save, or what's wrong. A blank amount means "none by default". */
export function mealFrom(
  name: string,
  rows: MealRow[],
  sk: string | undefined,
): SaveKitchenItem | string {
  if (!name.trim()) return "Give the meal a name.";
  if (!rows.length) return "Add at least one item.";
  const items: MealItem[] = [];
  for (const r of rows) {
    const quantity = r.quantity.trim() === "" ? 0 : Number(r.quantity);
    if (!Number.isFinite(quantity) || quantity < 0)
      return `The amount for ${r.name} has to be a number, 0 or more.`;
    items.push({
      pantrySk: r.pantrySk,
      name: r.name.trim(),
      quantity,
      unit: r.unit.trim(),
    });
  }
  return { pk: "QUICKMEAL", ...(sk ? { sk } : {}), name: name.trim(), items };
}
