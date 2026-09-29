import type { Bill } from "../types";
import {
  addMonths,
  monthIndex,
  monthOf,
  parseMonth,
  type Month,
} from "./dates";
import { round2 } from "./money";
import { occurrencesIn } from "./schedule";
import { countedAmount, entryOf, type Entry } from "./status";

export type MonthView = {
  /** Every due date in the month, by date. */
  entries: Entry[];
  overdue: Entry[];
  /** Due in the next 7 days; this can reach into next month. */
  thisWeek: Entry[];
  /** Due later this month, or everything unpaid in a future month. */
  later: Entry[];
  waiting: Entry[];
  paid: Entry[];
  total: number;
  paidTotal: number;
  left: number;
  owed: number;
  /** Some amounts are estimates because a varying bill has none yet. */
  estimated: boolean;
};

const byDue = (a: Entry, b: Entry) =>
  a.due.getTime() - b.due.getTime() || a.bill.name.localeCompare(b.bill.name);

export function entriesIn(bills: Bill[], month: Month, today: Date): Entry[] {
  return bills
    .flatMap((bill) =>
      occurrencesIn(bill, month).map((o) => entryOf(bill, o, today)),
    )
    .sort(byDue);
}

export function monthView(bills: Bill[], month: Month, today: Date): MonthView {
  const entries = entriesIn(bills, month, today);
  const current = monthIndex(month) === monthIndex(monthOf(today));
  // Looking at this month, next month's first week counts as "this week".
  const spill = current
    ? entriesIn(bills, addMonths(month, 1), today).filter(
        (e) => e.state === "due" && e.daysLeft <= 7,
      )
    : [];

  const upcoming = entries.filter((e) => e.state === "due");
  const soon = current ? upcoming.filter((e) => e.daysLeft <= 7) : [];
  const total = round2(entries.reduce((sum, e) => sum + countedAmount(e), 0));
  const paidTotal = round2(
    entries.filter((e) => e.paid).reduce((sum, e) => sum + countedAmount(e), 0),
  );

  return {
    entries,
    overdue: entries.filter((e) => e.state === "overdue"),
    thisWeek: [...soon, ...spill].sort(byDue),
    later: upcoming.filter((e) => !soon.includes(e)),
    waiting: entries.filter((e) => e.state === "waiting"),
    paid: entries.filter((e) => e.state === "paid"),
    total,
    paidTotal,
    left: round2(total - paidTotal),
    owed: round2(
      entries.reduce(
        (sum, e) => sum + e.owed.reduce((s, o) => s + o.share, 0),
        0,
      ),
    ),
    estimated: entries.some((e) => e.bill.isVariable && e.amount === null),
  };
}

/** One due date of a bill, found by its history key. */
export function entryFor(bill: Bill, key: string, today: Date): Entry | null {
  const month = parseMonth(key.slice(0, 7));
  if (!month) return null;
  const occ = occurrencesIn(bill, month).find((o) => o.key === key);
  return occ ? entryOf(bill, occ, today) : null;
}
