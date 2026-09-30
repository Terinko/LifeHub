import { singular } from "./units";

/**
 * The form two item names are compared in: lower case, single spaces, and
 * the last word singular, so "Tomatoes" and "tomato" are the same item but
 * "oil" and "olive oil" are not.
 */
export function normalizeName(name: string | undefined | null): string {
  const words = (name ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  const last = words.pop();
  return last === undefined ? "" : [...words, singular(last)].join(" ");
}

export const sameName = (a: string, b: string) =>
  normalizeName(a) !== "" && normalizeName(a) === normalizeName(b);
