// eslint-disable-next-line @typescript-eslint/no-require-imports
const { validateBill } = require("../lambda/bills/index.js");

const monthly = {
  name: "Rent",
  amount: 1450,
  payeeName: "Landlord",
  dueDayOfMonth: 1,
};

describe("validateBill", () => {
  test("accepts a bill saved by the old screen", () => {
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

  test("accepts a yearly bill with a due date", () => {
    expect(
      validateBill({
        name: "Car registration",
        amount: 96,
        frequency: "yearly",
        anchorDate: "2026-10-03",
      }),
    ).toBeNull();
  });

  test("explains what's wrong", () => {
    expect(validateBill({ ...monthly, name: "  " })).toMatch(/name/);
    expect(validateBill({ ...monthly, amount: -5 })).toMatch(/amount/);
    expect(validateBill({ ...monthly, dueDayOfMonth: 32 })).toMatch(/1 and 31/);
    expect(validateBill({ ...monthly, frequency: "weekly" })).toMatch(/repeats/);
    expect(
      validateBill({ name: "Prime", amount: 139, frequency: "yearly" }),
    ).toMatch(/due date/);
    expect(validateBill({ ...monthly, endDate: "May 2027" })).toMatch(/2026-09/);
    expect(
      validateBill({ ...monthly, startMonth: "2026-09", endDate: "2026-08" }),
    ).toMatch(/end before/);
    expect(
      validateBill({ ...monthly, payers: [{ id: "p", name: "Mom", share: -1 }] }),
    ).toMatch(/share/);
  });
});
