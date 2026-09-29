import type { Bill, Payer } from "../types";
import { daysBetween } from "./dates";
import type { Occurrence } from "./schedule";
import { isSplit, repaid, sharesOf } from "./split";

/**
 * - due: not paid yet, due today or later
 * - overdue: not paid and the due date has passed
 * - waiting: you paid, someone still owes you their share
 * - paid: nothing left to do
 */
export type State = "due" | "overdue" | "waiting" | "paid";

export type Entry = {
  bill: Bill;
  key: string;
  due: Date;
  /** This payment's amount, or null when a varying bill has none yet. */
  amount: number | null;
  /** The last known amount of a varying bill, to estimate with. */
  estimate: number | null;
  state: State;
  /** You've paid the bill itself (by hand or by autopay). */
  paid: boolean;
  autoPaid: boolean;
  paidOn: string | null;
  /** Days until due (negative once late). */
  daysLeft: number;
  /** Split bills: people who haven't paid you back yet. */
  owed: { payer: Payer; share: number }[];
};

/** The last recorded amount before this payment. */
function lastAmount(bill: Bill, key: string): number | null {
  const earlier = Object.entries(bill.amountHistory ?? {})
    .filter(([k, v]) => k < key && typeof v === "number")
    .sort(([a], [b]) => a.localeCompare(b));
  const last = earlier[earlier.length - 1];
  return last ? (last[1] as number) : null;
}

export function entryOf(bill: Bill, occ: Occurrence, today: Date): Entry {
  const status = bill.statusHistory?.[occ.key];
  const daysLeft = daysBetween(today, occ.due);
  const autoPaid = !!bill.autopay && status === undefined && daysLeft <= 0;
  const paid = status === "PAID" || status === "SETTLED" || autoPaid;

  const recorded = bill.amountHistory?.[occ.key];
  const amount = bill.isVariable
    ? typeof recorded === "number"
      ? recorded
      : null
    : bill.amount;
  // With no past amount yet, the typical amount set on the bill stands in.
  const estimate = bill.isVariable
    ? (lastAmount(bill, occ.key) ?? (bill.amount > 0 ? bill.amount : null))
    : null;

  const shares = sharesOf(bill, amount ?? estimate ?? 0);
  const everyoneBack =
    status === "SETTLED" ||
    shares.payers.every((p) => repaid(p.payer, occ.key));
  const owed =
    paid && isSplit(bill) && status !== "SETTLED"
      ? shares.payers.filter((p) => !repaid(p.payer, occ.key))
      : [];

  const state: State = paid
    ? everyoneBack
      ? "paid"
      : "waiting"
    : daysLeft < 0
      ? "overdue"
      : "due";

  return {
    bill,
    key: occ.key,
    due: occ.due,
    amount,
    estimate,
    state,
    paid,
    autoPaid,
    paidOn: bill.paidDates?.[occ.key] ?? null,
    daysLeft,
    owed,
  };
}

/** The amount to count in totals: the real one, else the estimate. */
export const countedAmount = (e: Entry) => e.amount ?? e.estimate ?? 0;
