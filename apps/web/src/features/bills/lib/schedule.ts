import type { Bill, Frequency } from "../types";
import {
  addDays,
  clampedDay,
  daysBetween,
  dayKey,
  monthIndex,
  monthKey,
  parseDay,
  parseMonth,
  type Month,
} from "./dates";

/** One due date of a bill. `key` indexes its status and amount history. */
export type Occurrence = { key: string; due: Date };

export const frequencyOf = (bill: Bill): Frequency =>
  bill.frequency ?? "monthly";

/**
 * The first month a bill counts in. Older bills have no start, so their
 * earliest recorded month stands in; a bill with no history has no start.
 */
export function startMonthOf(bill: Bill): Month | null {
  if (bill.startMonth) return parseMonth(bill.startMonth);
  const keys = [
    ...Object.keys(bill.statusHistory ?? {}),
    ...Object.keys(bill.amountHistory ?? {}),
  ].sort();
  return keys[0] ? parseMonth(keys[0]) : null;
}

function inRange(bill: Bill, month: Month): boolean {
  const start = startMonthOf(bill);
  if (start && monthIndex(month) < monthIndex(start)) return false;
  const end = bill.endDate ? parseMonth(bill.endDate) : null;
  return !(end && monthIndex(month) > monthIndex(end));
}

function nonMonthly(bill: Bill, month: Month, anchor: Date): Date[] {
  const anchorMonth = { y: anchor.getFullYear(), m: anchor.getMonth() };
  const diff = monthIndex(month) - monthIndex(anchorMonth);
  if (diff < 0) return [];
  switch (frequencyOf(bill)) {
    case "once":
      return diff === 0 ? [anchor] : [];
    case "yearly":
      return diff % 12 === 0 ? [clampedDay(month, anchor.getDate())] : [];
    case "quarterly":
      return diff % 3 === 0 ? [clampedDay(month, anchor.getDate())] : [];
    case "biweekly": {
      const first = new Date(month.y, month.m, 1);
      const steps = Math.max(0, Math.ceil(daysBetween(anchor, first) / 14));
      const dates: Date[] = [];
      for (
        let d = addDays(anchor, steps * 14);
        d.getMonth() === month.m;
        d = addDays(d, 14)
      )
        if (d.getFullYear() === month.y) dates.push(d);
      return dates;
    }
    default:
      return [];
  }
}

/** Every due date a bill has in a month, oldest first. */
export function occurrencesIn(bill: Bill, month: Month): Occurrence[] {
  if (!inRange(bill, month)) return [];
  if (frequencyOf(bill) === "monthly") {
    const due = clampedDay(month, bill.dueDayOfMonth ?? 1);
    return [{ key: monthKey(month), due }];
  }
  const anchor = parseDay(bill.anchorDate);
  if (!anchor) return [];
  return nonMonthly(bill, month, anchor).map((due) => ({
    key: dayKey(due),
    due,
  }));
}

/** "Monthly on the 5th" style description of the schedule. */
export function scheduleText(
  bill: Bill,
  ordinal: (n: number) => string,
): string {
  const anchor = parseDay(bill.anchorDate);
  const on = anchor
    ? anchor.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";
  switch (frequencyOf(bill)) {
    case "monthly":
      return `Monthly on the ${ordinal(bill.dueDayOfMonth ?? 1)}`;
    case "biweekly":
      return `Every 2 weeks from ${on}`;
    case "quarterly":
      return `Every 3 months from ${on}`;
    case "yearly":
      return `Yearly on ${on}`;
    case "once":
      return `Once, on ${on}`;
  }
}
