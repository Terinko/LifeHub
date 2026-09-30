import type {
  GroceryItem,
  PantryItem,
  PantryLocation,
  SaveKitchenItem,
} from "@lifehub/shared";
import { guessLocation } from "./places";

export type AmountRow = { quantity: string; unit: string };

/** What the edit sheet holds while someone types. */
export type ItemForm = {
  name: string;
  amount: AmountRow;
  extra: AmountRow[];
  location: PantryLocation;
  lowAt: string;
};

const text = (n: number | undefined) => (n === undefined ? "" : String(n));

export function formFrom(
  item: GroceryItem | PantryItem | null,
  kind: "GROCERY" | "INVENTORY",
): ItemForm {
  const qty = item
    ? item.pk === "GROCERY"
      ? item.quantity
      : item.currentQuantity
    : undefined;
  return {
    name: item?.name ?? "",
    amount: {
      quantity: text(qty ?? (kind === "GROCERY" ? 1 : undefined)),
      unit: item?.unit ?? "",
    },
    extra: (item?.extra ?? []).map((e) => ({
      quantity: text(e.quantity),
      unit: e.unit,
    })),
    location:
      item?.pk === "INVENTORY"
        ? (item.location ?? guessLocation(item.name))
        : "shelf",
    lowAt: item?.pk === "INVENTORY" ? text(item.lowAt) : "",
  };
}

const toNumber = (s: string) => (s.trim() === "" ? NaN : Number(s));

/**
 * Turns the form into an item to save, or an error message to show.
 * Blank extra rows are dropped; a blank pantry warning means "only when out".
 */
export function itemFrom(
  form: ItemForm,
  kind: "GROCERY" | "INVENTORY",
  original: GroceryItem | PantryItem | null,
): SaveKitchenItem | string {
  const name = form.name.trim();
  if (!name) return "Give it a name.";
  const quantity =
    form.amount.quantity.trim() === ""
      ? kind === "GROCERY"
        ? 1
        : 0
      : toNumber(form.amount.quantity);
  if (!Number.isFinite(quantity) || quantity < 0)
    return "The amount has to be a number, 0 or more.";
  const extra = form.extra
    .filter((e) => e.quantity.trim() !== "" || e.unit.trim() !== "")
    .map((e) => ({ quantity: toNumber(e.quantity), unit: e.unit.trim() }));
  if (
    extra.some((e) => !Number.isFinite(e.quantity) || e.quantity < 0 || !e.unit)
  )
    return "Each extra amount needs a number and a unit.";
  const unit = form.amount.unit.trim();
  const base = {
    ...(original?.sk ? { sk: original.sk } : {}),
    name,
    unit,
    ...(extra.length ? { extra } : {}),
  };

  if (kind === "GROCERY") {
    const inCart =
      original?.pk === "GROCERY" && original.inCart ? { inCart: true } : {};
    return { pk: "GROCERY", ...base, quantity, ...inCart };
  }
  const lowAt = form.lowAt.trim() === "" ? undefined : toNumber(form.lowAt);
  if (lowAt !== undefined && (!Number.isFinite(lowAt) || lowAt < 0))
    return "The warning amount has to be a number, 0 or more.";
  const guessed =
    form.location === guessLocation(name) &&
    !(original?.pk === "INVENTORY" && original.location);
  return {
    pk: "INVENTORY",
    ...base,
    currentQuantity: quantity,
    ...(guessed ? {} : { location: form.location }),
    ...(lowAt === undefined ? {} : { lowAt }),
  };
}
