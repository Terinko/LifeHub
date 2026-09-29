import { describe, expect, it } from "vitest";
import { bill, TODAY } from "../test/fixtures";
import { billFromForm, blankForm, formOf } from "./form";

describe("billFromForm", () => {
  it("keeps a bill's history when it's edited", () => {
    const old = bill({
      name: "Rent",
      statusHistory: { "2026-08": "PAID" },
      amountHistory: {},
    });
    const form = { ...formOf(old, TODAY), name: " Rent ", amount: "1,500" };
    const result = billFromForm(form, old, TODAY);
    expect(result).toMatchObject({
      bill: {
        id: old.id,
        name: "Rent",
        amount: 1500,
        statusHistory: { "2026-08": "PAID" },
      },
    });
  });

  it("starts a new bill this month so past months don't show as unpaid", () => {
    const form = {
      ...blankForm(TODAY),
      name: "Gym",
      amount: "40",
      dueDay: "3",
    };
    const result = billFromForm(form, null, TODAY);
    expect(result).toMatchObject({
      bill: { startMonth: "2026-09", dueDayOfMonth: 3, endDate: null },
    });
  });

  it("works out the last month from the payments left", () => {
    const form = {
      ...blankForm(TODAY),
      name: "Car loan",
      amount: "389",
      ends: "after" as const,
      count: "8",
    };
    // Sep through Apr is 8 monthly payments.
    expect(billFromForm(form, null, TODAY)).toMatchObject({
      bill: { endDate: "2027-04" },
    });
  });

  it("says what to fix", () => {
    const base = { ...blankForm(TODAY), name: "Gym", amount: "40" };
    const error = (fields: object) => {
      const r = billFromForm({ ...base, ...fields }, null, TODAY);
      return "error" in r ? r.error : null;
    };
    expect(error({ name: "" })).toMatch(/name/);
    expect(error({ amount: "abc" })).toMatch(/amount/);
    expect(error({ dueDay: "32" })).toMatch(/1 and 31/);
    expect(error({ isShared: true, people: [] })).toMatch(/split it with/);
    expect(
      error({ ends: "on", endMonth: "2026-01", startMonth: "2026-09" }),
    ).toMatch(/end before/);
    expect(error({ isVariable: true, amount: "" })).toBeNull();
  });
});
