import { describe, expect, it } from "vitest";
import { validateBill } from "./validateBill";

const monthly = {
  name: "Rent",
  amount: 1450,
  payeeName: "Landlord",
  dueDayOfMonth: 1,
};

describe("validateBill", () => {
  it("accepts a bill saved by the old screen", () => {
    expect(
      validateBill({
        ...monthly,
        endDate: "2027-05",
        statusHistory: { "2026-09": "SETTLED" },
        isShared: true,
        payers: [{ id: "p1", name: "Person 1", paidHistory: {} }],
      }),
    ).toBeNull();
  });

  it("accepts a yearly bill with a due date", () => {
    expect(
      validateBill({
        name: "Car registration",
        amount: 96,
        frequency: "yearly",
        anchorDate: "2026-10-03",
      }),
    ).toBeNull();
  });

  it("accepts blank months, a free bill and blank shares", () => {
    expect(
      validateBill({
        ...monthly,
        amount: 0,
        startMonth: null,
        endDate: null,
        payers: [{ id: "p", name: "Mom", share: null }],
      }),
    ).toBeNull();
  });

  it("explains what's wrong", () => {
    expect(validateBill({ ...monthly, name: "  " })).toMatch(/name/);
    expect(validateBill({ ...monthly, amount: -5 })).toMatch(/amount/);
    expect(validateBill({ ...monthly, dueDayOfMonth: 32 })).toMatch(/1 and 31/);
    expect(validateBill({ ...monthly, frequency: "weekly" })).toMatch(
      /repeats/,
    );
    expect(
      validateBill({ name: "Prime", amount: 139, frequency: "yearly" }),
    ).toMatch(/due date/);
    expect(validateBill({ ...monthly, endDate: "May 2027" })).toMatch(
      /2026-09/,
    );
    expect(
      validateBill({ ...monthly, startMonth: "2026-09", endDate: "2026-08" }),
    ).toMatch(/end before/);
    expect(
      validateBill({
        ...monthly,
        payers: [{ id: "p", name: "Mom", share: -1 }],
      }),
    ).toMatch(/share/);
  });

  it("returns the exact messages the screen shows", () => {
    const cases: [unknown, string][] = [
      [null, "Send the bill as JSON."],
      ["Rent", "Send the bill as JSON."],
      [{ amount: 5 }, "Give the bill a name."],
      [
        { ...monthly, name: "x".repeat(101) },
        "Keep the name under 100 characters.",
      ],
      [
        { ...monthly, amount: "5" },
        "The amount has to be a number of dollars, 0 or more.",
      ],
      [
        { ...monthly, amount: Infinity },
        "The amount has to be a number of dollars, 0 or more.",
      ],
      [{ ...monthly, frequency: "weekly" }, "Pick how often the bill repeats."],
      [
        { ...monthly, dueDayOfMonth: 1.5 },
        "The due day has to be between 1 and 31.",
      ],
      [
        { ...monthly, dueDayOfMonth: undefined },
        "The due day has to be between 1 and 31.",
      ],
      [
        { ...monthly, frequency: "once", anchorDate: "2026-02-30x" },
        "Pick the next due date.",
      ],
      [
        { ...monthly, startMonth: "2026-13" },
        "Start month has to look like 2026-09.",
      ],
      [{ ...monthly, endDate: 202609 }, "End month has to look like 2026-09."],
      [
        { ...monthly, startMonth: "2026-09", endDate: "2026-08" },
        "The bill can't end before it starts.",
      ],
      [
        { ...monthly, payers: "Mom" },
        "A bill can be split with up to 20 people.",
      ],
      [
        {
          ...monthly,
          payers: Array.from({ length: 21 }, (_, i) => ({
            id: `${i}`,
            name: "P",
          })),
        },
        "A bill can be split with up to 20 people.",
      ],
      [{ ...monthly, payers: [null] }, "Each person on a split needs a name."],
      [
        { ...monthly, payers: [{ id: "p" }] },
        "Each person on a split needs a name.",
      ],
      [
        { ...monthly, payers: [{ id: "p", name: "Mom", share: "5" }] },
        "Each share has to be a number of dollars, 0 or more.",
      ],
    ];
    for (const [bill, message] of cases) {
      expect(validateBill(bill)).toBe(message);
    }
  });

  it("allows 100-character names (checked after trimming)", () => {
    expect(
      validateBill({ ...monthly, name: ` ${"x".repeat(100)} ` }),
    ).toBeNull();
  });
});
