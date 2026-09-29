import type { Bill, Payer } from "../types";
import {
  addMonths,
  monthIndex,
  monthOf,
  monthShort,
  parseMonth,
  type Month,
} from "./dates";
import { entriesIn } from "./month";
import { round2 } from "./money";
import { payoffOf, type Payoff } from "./payoff";
import { frequencyOf } from "./schedule";
import { sharesOf } from "./split";

const PER_MONTH = {
  monthly: 1,
  biweekly: 26 / 12,
  quarterly: 1 / 3,
  yearly: 1 / 12,
  once: 0,
};

/** A varying bill's typical amount: the average of its last 12. */
function typicalAmount(bill: Bill): number | null {
  if (!bill.isVariable) return bill.amount;
  const amounts = Object.entries(bill.amountHistory ?? {})
    .filter(([, v]) => typeof v === "number")
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([, v]) => v as number);
  if (amounts.length === 0) return null;
  return round2(amounts.reduce((s, v) => s + v, 0) / amounts.length);
}

function active(bill: Bill, now: Month): boolean {
  const end = bill.endDate ? parseMonth(bill.endDate) : null;
  return !(end && monthIndex(end) < monthIndex(now));
}

export type CostRow = { bill: Bill; perMonth: number; note: string | null };
export type Owed = {
  bill: Bill;
  key: string;
  payer: Payer;
  share: number;
  label: string;
};
export type MonthMark = {
  label: string;
  mark: "all" | "missed" | "none" | "now";
};

export function overview(bills: Bill[], today: Date) {
  const now = monthOf(today);
  const live = bills.filter((b) => active(b, now));

  const rows: CostRow[] = [];
  const yearly: { bill: Bill; amount: number; month: string }[] = [];
  for (const bill of live) {
    const typical = typicalAmount(bill);
    if (typical === null) continue;
    const mine = sharesOf(bill, typical).mine;
    const freq = frequencyOf(bill);
    if (freq === "yearly") {
      const month = bill.anchorDate
        ? monthShort(Number(bill.anchorDate.slice(5, 7)) - 1)
        : "";
      yearly.push({ bill, amount: mine, month });
      continue;
    }
    if (freq === "once") continue;
    const note = bill.isVariable
      ? "avg"
      : mine !== typical
        ? "your share"
        : null;
    rows.push({ bill, perMonth: round2(mine * PER_MONTH[freq]), note });
  }
  rows.sort((a, b) => b.perMonth - a.perMonth);
  const perMonth = round2(
    rows.reduce((s, r) => s + r.perMonth, 0) +
      yearly.reduce((s, y) => s + y.amount / 12, 0),
  );

  const payoffs = live
    .map((b) => payoffOf(b, today))
    .filter((p): p is Payoff => !!p);

  const owed: Owed[] = [];
  for (let i = 11; i >= 0; i--) {
    const month = addMonths(now, -i);
    for (const e of entriesIn(bills, month, today))
      for (const o of e.owed)
        owed.push({
          bill: e.bill,
          key: e.key,
          payer: o.payer,
          share: o.share,
          label: monthShort(month.m),
        });
  }

  const marks: MonthMark[] = [];
  for (let i = 11; i >= 0; i--) {
    const month = addMonths(now, -i);
    const label = monthShort(month.m).slice(0, 1);
    if (i === 0) {
      marks.push({ label, mark: "now" });
      continue;
    }
    const entries = entriesIn(bills, month, today);
    marks.push({
      label,
      mark:
        entries.length === 0
          ? "none"
          : entries.every((e) => e.paid)
            ? "all"
            : "missed",
    });
  }

  return {
    perMonth,
    perYear: round2(perMonth * 12),
    rows,
    yearly,
    payoffs,
    owed,
    marks,
  };
}
