const FREQUENCIES = ["monthly", "biweekly", "quarterly", "yearly", "once"];
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

type Loose = Record<string, unknown>;

const isDollars = (n: unknown) =>
  typeof n === "number" && Number.isFinite(n) && n >= 0;

function scheduleProblem(bill: Loose): string | null {
  const frequency = bill.frequency ?? "monthly";
  if (!FREQUENCIES.includes(frequency as string))
    return "Pick how often the bill repeats.";
  if (frequency === "monthly") {
    const day = bill.dueDayOfMonth;
    if (!Number.isInteger(day) || (day as number) < 1 || (day as number) > 31)
      return "The due day has to be between 1 and 31.";
  } else if (
    typeof bill.anchorDate !== "string" ||
    !DAY.test(bill.anchorDate)
  ) {
    return "Pick the next due date.";
  }
  return null;
}

function monthsProblem(bill: Loose): string | null {
  for (const key of ["startMonth", "endDate"]) {
    const v = bill[key];
    if (
      v !== undefined &&
      v !== null &&
      !(typeof v === "string" && MONTH.test(v))
    )
      return `${key === "endDate" ? "End" : "Start"} month has to look like 2026-09.`;
  }
  if (
    bill.startMonth &&
    bill.endDate &&
    (bill.endDate as string) < (bill.startMonth as string)
  )
    return "The bill can't end before it starts.";
  return null;
}

function payersProblem(payers: unknown): string | null {
  if (!Array.isArray(payers) || payers.length > 20)
    return "A bill can be split with up to 20 people.";
  for (const p of payers as (Loose | null)[]) {
    if (!p || typeof p.id !== "string" || typeof p.name !== "string")
      return "Each person on a split needs a name.";
    if (p.share !== undefined && p.share !== null && !isDollars(p.share))
      return "Each share has to be a number of dollars, 0 or more.";
  }
  return null;
}

/**
 * Checks a bill before it's saved. Returns an error message for the person,
 * or null when the bill is fine. Older bills (no frequency) are monthly.
 */
export function validateBill(input: unknown): string | null {
  if (!input || typeof input !== "object") return "Send the bill as JSON.";
  const bill = input as Loose;
  const name = typeof bill.name === "string" ? bill.name.trim() : "";
  if (!name) return "Give the bill a name.";
  if (name.length > 100) return "Keep the name under 100 characters.";
  if (!isDollars(bill.amount))
    return "The amount has to be a number of dollars, 0 or more.";
  return (
    scheduleProblem(bill) ??
    monthsProblem(bill) ??
    (bill.payers !== undefined ? payersProblem(bill.payers) : null)
  );
}
