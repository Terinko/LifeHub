import type { Bill } from "../types";

let n = 0;
export const bill = (fields: Partial<Bill> = {}): Bill => ({
  id: `b${++n}`,
  name: "Bill",
  amount: 100,
  payeeName: "Payee",
  dueDayOfMonth: 5,
  startMonth: "2026-01",
  ...fields,
});

/** Tue, Sep 29, 2026: the day the redesign was checked against. */
export const TODAY = new Date(2026, 8, 29);
export const SEP = { y: 2026, m: 8 };
