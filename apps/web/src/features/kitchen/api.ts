import type {
  ExtraQuantity,
  GroceryItem,
  KitchenItem,
  KitchenType,
  LogMealResult,
  MealItem,
  PantryItem,
  ParsedIngredient,
  PutAwayResult,
  SaveKitchenItem,
} from "@lifehub/shared";
import { api } from "../../shared/api/client";

type Raw = Record<string, unknown> & { pk: string; sk: string };

const num = (v: unknown) => Number(v) || 0;
const text = (v: unknown) => (typeof v === "string" ? v : "");
const extras = (v: unknown): ExtraQuantity[] | undefined =>
  Array.isArray(v) && v.length
    ? v.map((e) => ({ quantity: num(e?.quantity), unit: text(e?.unit) }))
    : undefined;

/** Older items can carry numbers as strings or leave fields off; read them safely. */
export function normalize(raw: Raw): KitchenItem {
  const base = { sk: raw.sk, name: text(raw.name) };
  if (raw.pk === "QUICKMEAL") {
    const items = Array.isArray(raw.items) ? (raw.items as Raw[]) : [];
    return {
      ...base,
      pk: "QUICKMEAL",
      items: items.map((i): MealItem => ({
        pantrySk: typeof i.pantrySk === "string" ? i.pantrySk : null,
        name: text(i.name),
        quantity: num(i.quantity),
        unit: text(i.unit),
      })),
    };
  }
  const extra = extras(raw.extra);
  if (raw.pk === "INVENTORY") {
    const item: PantryItem = {
      ...base,
      pk: "INVENTORY",
      currentQuantity: num(raw.currentQuantity),
      unit: text(raw.unit),
    };
    if (extra) item.extra = extra;
    if (
      raw.location === "fridge" ||
      raw.location === "freezer" ||
      raw.location === "shelf"
    )
      item.location = raw.location;
    if (raw.lowAt !== undefined && raw.lowAt !== null)
      item.lowAt = num(raw.lowAt);
    return item;
  }
  const item: GroceryItem = {
    ...base,
    pk: "GROCERY",
    quantity: num(raw.quantity),
    unit: text(raw.unit),
  };
  if (extra) item.extra = extra;
  if (raw.inCart === true) item.inCart = true;
  return item;
}

export const getKitchen = async () =>
  (await api.get<Raw[]>("/kitchen")).map(normalize);

export const saveItem = async (item: SaveKitchenItem) =>
  normalize(await api.post<Raw>("/kitchen", item));

export const deleteItem = (item: { pk: KitchenType; sk: string }) =>
  api.delete<unknown>(`/kitchen/${encodeURIComponent(item.sk)}?pk=${item.pk}`);

export const putAway = async (sks: string[]) => {
  const res = await api.post<PutAwayResult>("/kitchen", {
    action: "PUT_AWAY",
    sks,
  });
  return {
    ...res,
    pantryItems: res.pantryItems.map((p) => normalize(p) as PantryItem),
  };
};

export const logMeal = async (items: MealItem[]) => {
  const res = await api.post<LogMealResult>("/kitchen", {
    action: "LOG_QUICK_MEAL",
    items,
  });
  return {
    ...res,
    pantryItems: res.pantryItems.map((p) => normalize(p) as PantryItem),
  };
};

export type Restore = {
  put: KitchenItem[];
  remove: { pk: KitchenType; sk: string }[];
};

export const restore = (r: Restore) =>
  api.post<unknown>("/kitchen", { action: "RESTORE", ...r });

export const parseIngredients = async (ingredientsText: string) =>
  (
    await api.post<{ ingredients: ParsedIngredient[] }>("/kitchen", {
      action: "PARSE_INGREDIENTS",
      ingredientsText,
    })
  ).ingredients;
