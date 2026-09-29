import { frequencyOf } from "./schedule";
import { formatShort } from "./money";
import { ordinal, parseDay, shortDate } from "./dates";
import type { Entry } from "./status";

export type Tone = "rose" | "amber" | "sky" | "lime" | "plain";

/** A short status for a due date, like "11 days late" or "Due Saturday". */
export function statusText(e: Entry): { text: string; tone: Tone } {
  switch (e.state) {
    case "overdue":
      return {
        text: e.daysLeft === -1 ? "1 day late" : `${-e.daysLeft} days late`,
        tone: "rose",
      };
    case "due":
      return { text: dueText(e), tone: e.daysLeft <= 7 ? "amber" : "plain" };
    case "waiting":
      return { text: owedText(e), tone: "sky" };
    case "paid":
      return { text: paidText(e), tone: "lime" };
  }
}

function dueText(e: Entry): string {
  const verb = e.bill.autopay ? "Autopays" : "Due";
  if (e.daysLeft === 0) return `${verb} today`;
  if (e.daysLeft === 1) return `${verb} tomorrow`;
  if (e.daysLeft < 7)
    return `${verb} ${e.due.toLocaleDateString("en-US", { weekday: "long" })}`;
  return `${verb} ${shortDate(e.due)}`;
}

function owedText(e: Entry): string {
  const names = e.owed.map((o) => o.payer.name);
  const total = e.owed.reduce((s, o) => s + o.share, 0);
  const who =
    names.length <= 2 ? names.join(" and ") : `${names.length} people`;
  return `${who} ${names.length === 1 ? "owes" : "owe"} you ${formatShort(total)}`;
}

function paidText(e: Entry): string {
  const on = parseDay(e.paidOn ?? undefined);
  if (e.autoPaid) return `Autopaid ${shortDate(e.due)}`;
  return on ? `Paid ${shortDate(on)}` : "Paid";
}

/** The second part of a row's meta line: why the date moved, or who you pay. */
export function detailText(e: Entry): string {
  const bill = e.bill;
  if (bill.isVariable && e.amount === null && !e.paid) return "amount needed";
  const day = bill.dueDayOfMonth ?? 1;
  if (frequencyOf(bill) === "monthly" && e.due.getDate() < day)
    return `due the ${ordinal(day)}`;
  return bill.payeeName?.trim() ?? "";
}
