import type { Bill } from "../types";
import { dayKey } from "./dates";
import { isSplit, repaid } from "./split";

/** Each change returns a new bill to save; the old one is the undo. */

/** A copy of a record without one key. */
function without<T>(
  record: Record<string, T> | undefined,
  key: string,
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(record ?? {}).filter(([k]) => k !== key),
  );
}

function withStatus(bill: Bill, key: string, allBack: boolean): Bill {
  return {
    ...bill,
    statusHistory: {
      ...bill.statusHistory,
      [key]: isSplit(bill) && allBack ? "SETTLED" : "PAID",
    },
  };
}

const everyoneBack = (bill: Bill, key: string) =>
  (bill.payers ?? []).every((p) => repaid(p, key));

export function markPaid(bill: Bill, key: string, today: Date): Bill {
  return {
    ...withStatus(bill, key, everyoneBack(bill, key)),
    paidDates: { ...bill.paidDates, [key]: dayKey(today) },
  };
}

/** Autopay bills keep an explicit "not paid" so autopay doesn't re-mark them. */
export function markUnpaid(bill: Bill, key: string): Bill {
  const statusHistory = bill.autopay
    ? { ...bill.statusHistory, [key]: "UNPAID" as const }
    : without(bill.statusHistory, key);
  return { ...bill, statusHistory, paidDates: without(bill.paidDates, key) };
}

export function setAmount(
  bill: Bill,
  key: string,
  amount: number | null,
): Bill {
  const amountHistory =
    amount === null
      ? without(bill.amountHistory, key)
      : { ...bill.amountHistory, [key]: amount };
  return { ...bill, amountHistory };
}

/** Records (or un-records) someone paying you back, and settles when all have. */
export function setRepaid(
  bill: Bill,
  key: string,
  payerId: string,
  back: boolean,
  today: Date,
  youPaid: boolean,
): Bill {
  const payers = (bill.payers ?? []).map((p) => {
    if (p.id !== payerId) return p;
    const paidHistory = back
      ? { ...p.paidHistory, [key]: dayKey(today) }
      : without(p.paidHistory, key);
    return { ...p, paidHistory };
  });
  const next = { ...bill, payers };
  return youPaid ? withStatus(next, key, everyoneBack(next, key)) : next;
}
