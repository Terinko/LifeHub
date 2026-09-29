import type { Bill, Frequency } from "../types";
import { dayKey, monthKey, monthOf } from "./dates";
import { parseAmount } from "./money";
import { endAfter } from "./payoff";
import { frequencyOf } from "./schedule";

export type Ends = "never" | "on" | "after";

export type PersonDraft = { id: string; name: string; share: string };

/** The edit screen's fields, as typed. */
export type BillForm = {
  name: string;
  payee: string;
  amount: string;
  isVariable: boolean;
  frequency: Frequency;
  dueDay: string;
  anchorDate: string;
  startMonth: string;
  ends: Ends;
  endMonth: string;
  count: string;
  autopay: boolean;
  isShared: boolean;
  people: PersonDraft[];
  notes: string;
};

const money = (n: number | null | undefined) =>
  n === null || n === undefined ? "" : String(n);

export const newId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function blankForm(today: Date): BillForm {
  return {
    name: "",
    payee: "",
    amount: "",
    isVariable: false,
    frequency: "monthly",
    dueDay: String(today.getDate()),
    anchorDate: dayKey(today),
    startMonth: monthKey(monthOf(today)),
    ends: "never",
    endMonth: "",
    count: "",
    autopay: false,
    isShared: false,
    people: [],
    notes: "",
  };
}

export function formOf(bill: Bill, today: Date): BillForm {
  const blank = blankForm(today);
  return {
    ...blank,
    name: bill.name,
    payee: bill.payeeName ?? "",
    amount: bill.isVariable && !bill.amount ? "" : money(bill.amount),
    isVariable: !!bill.isVariable,
    frequency: frequencyOf(bill),
    dueDay: String(bill.dueDayOfMonth ?? blank.dueDay),
    anchorDate: bill.anchorDate ?? blank.anchorDate,
    startMonth: bill.startMonth ?? "",
    ends: bill.endDate ? "on" : "never",
    endMonth: bill.endDate ?? "",
    autopay: !!bill.autopay,
    isShared: !!bill.isShared,
    people: (bill.payers ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      share: money(p.share),
    })),
    notes: bill.notes ?? "",
  };
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Turns the form into the bill to save, keeping the history of `base`.
 * Returns an error message for the person when something needs fixing.
 */
export function billFromForm(
  form: BillForm,
  base: Bill | null,
  today: Date,
): { bill: Bill } | { error: string } {
  const name = form.name.trim();
  if (!name) return { error: "Give the bill a name." };
  if (name.length > 100)
    return { error: "Keep the name under 100 characters." };

  const amount = parseAmount(form.amount);
  if (amount === null && !(form.isVariable && form.amount.trim() === ""))
    return { error: "Enter the amount in dollars, like 96.00." };

  const monthly = form.frequency === "monthly";
  const dueDay = Number(form.dueDay);
  if (monthly && !(Number.isInteger(dueDay) && dueDay >= 1 && dueDay <= 31))
    return { error: "The due day has to be between 1 and 31." };
  if (!monthly && !DAY.test(form.anchorDate))
    return { error: "Pick the next due date." };

  const startMonth = form.startMonth || null;
  if (startMonth && !MONTH.test(startMonth))
    return { error: "Pick the first month." };

  const people = form.people.map((p) => ({ ...p, name: p.name.trim() }));
  if (form.isShared) {
    if (people.length === 0) return { error: "Add who you split it with." };
    if (people.some((p) => !p.name))
      return { error: "Each person on the split needs a name." };
    if (
      people.some((p) => p.share.trim() !== "" && parseAmount(p.share) === null)
    )
      return {
        error:
          "Enter each share in dollars, or leave it blank to split evenly.",
      };
  }

  const payers = form.isShared
    ? people.map((p) => {
        const old = base?.payers?.find((o) => o.id === p.id);
        const share = p.share.trim() === "" ? null : parseAmount(p.share);
        return { ...old, id: p.id, name: p.name, share };
      })
    : base?.payers;

  const bill: Bill = {
    ...base,
    id: base?.id ?? newId(),
    name,
    amount: amount ?? 0,
    payeeName: form.payee.trim(),
    frequency: form.frequency,
    dueDayOfMonth: monthly ? dueDay : base?.dueDayOfMonth,
    anchorDate: monthly ? base?.anchorDate : form.anchorDate,
    startMonth: startMonth ?? base?.startMonth ?? null,
    endDate: null,
    autopay: form.autopay,
    isVariable: form.isVariable,
    isShared: form.isShared,
    payers,
    notes: form.notes.trim(),
  };

  if (form.ends === "on") {
    if (!MONTH.test(form.endMonth)) return { error: "Pick the last month." };
    bill.endDate = form.endMonth;
  } else if (form.ends === "after") {
    const count = Number(form.count);
    if (!(Number.isInteger(count) && count >= 1 && count <= 600))
      return { error: "Enter how many payments are left, like 12." };
    bill.endDate = endAfter(bill, count, monthOf(today));
    if (!bill.endDate)
      return { error: "That schedule has no due dates to count." };
  }
  if (bill.startMonth && bill.endDate && bill.endDate < bill.startMonth)
    return { error: "The bill can't end before it starts." };

  return { bill };
}
