import type { Bill } from "../types";
import {
  addMonths,
  monthIndex,
  monthOf,
  parseMonth,
  type Month,
} from "./dates";
import { round2 } from "./money";
import { frequencyOf, occurrencesIn, startMonthOf } from "./schedule";
import { entryOf } from "./status";

export type Payoff = {
  bill: Bill;
  left: number;
  remaining: number;
  made: number;
  last: Month;
};

/** How far along a bill with an end month is, or null when it never ends. */
export function payoffOf(bill: Bill, today: Date): Payoff | null {
  const last = bill.endDate ? parseMonth(bill.endDate) : null;
  if (!last || frequencyOf(bill) === "once") return null;
  const now = monthOf(today);
  const start = startMonthOf(bill) ?? now;
  let left = 0;
  let made = 0;
  let remaining = 0;
  for (
    let m = start, n = 0;
    monthIndex(m) <= monthIndex(last) && n < 600;
    m = addMonths(m, 1), n++
  ) {
    for (const occ of occurrencesIn(bill, m)) {
      const entry = entryOf(bill, occ, today);
      if (entry.paid) made += 1;
      else if (monthIndex(m) >= monthIndex(now)) {
        left += 1;
        remaining += entry.amount ?? entry.estimate ?? 0;
      }
    }
  }
  return left > 0
    ? { bill, left, made, remaining: round2(remaining), last }
    : null;
}

/**
 * The end month that leaves a bill `count` more due dates, counting from
 * `from` (or its start, if later). Null when the schedule has none to count.
 */
export function endAfter(
  bill: Bill,
  count: number,
  from: Month,
): string | null {
  const start = startMonthOf(bill);
  const first = start && monthIndex(start) > monthIndex(from) ? start : from;
  if (count < 1) return null;
  let seen = 0;
  for (let m = first, n = 0; n < 1200; m = addMonths(m, 1), n++) {
    seen += occurrencesIn({ ...bill, endDate: null }, m).length;
    if (seen >= count) return `${m.y}-${String(m.m + 1).padStart(2, "0")}`;
  }
  return null;
}
