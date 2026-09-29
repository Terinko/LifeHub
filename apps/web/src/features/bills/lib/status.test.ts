import { describe, expect, it } from "vitest";
import { bill, SEP, TODAY } from "../test/fixtures";
import { markPaid, markUnpaid, setRepaid } from "./actions";
import { monthView } from "./month";
import { occurrencesIn } from "./schedule";
import { sharesOf } from "./split";
import { entryOf } from "./status";

const entry = (b: ReturnType<typeof bill>) => {
  const occ = occurrencesIn(b, SEP)[0];
  if (!occ) throw new Error("no due date");
  return entryOf(b, occ, TODAY);
};

describe("status", () => {
  it("calls a past-due unpaid bill overdue, not upcoming", () => {
    const e = entry(bill({ dueDayOfMonth: 5 }));
    expect(e.state).toBe("overdue");
    expect(e.daysLeft).toBe(-24);
  });

  it("reads old statuses: PAID on a plain bill is done", () => {
    expect(entry(bill({ statusHistory: { "2026-09": "PAID" } })).state).toBe(
      "paid",
    );
    expect(entry(bill({ statusHistory: { "2026-09": "SETTLED" } })).state).toBe(
      "paid",
    );
  });

  it("autopays on the due date unless marked unpaid", () => {
    const auto = bill({ autopay: true, dueDayOfMonth: 29 });
    expect(entry(auto).autoPaid).toBe(true);
    expect(entry(bill({ autopay: true, dueDayOfMonth: 30 })).state).toBe("due");
    expect(entry(markUnpaid(auto, "2026-09")).state).toBe("due");
  });

  it("waits on people's shares and settles when all pay back", () => {
    const phone = bill({
      amount: 180,
      isShared: true,
      payers: [
        { id: "mom", name: "Mom" },
        { id: "dad", name: "Dad" },
      ],
    });
    expect(sharesOf(phone, 180).mine).toBe(60);
    const paid = markPaid(phone, "2026-09", TODAY);
    expect(entry(paid).state).toBe("waiting");
    expect(entry(paid).owed.map((o) => [o.payer.name, o.share])).toEqual([
      ["Mom", 60],
      ["Dad", 60],
    ]);
    const mom = setRepaid(paid, "2026-09", "mom", true, TODAY, true);
    expect(entry(mom).state).toBe("waiting");
    const both = setRepaid(mom, "2026-09", "dad", true, TODAY, true);
    expect(both.statusHistory?.["2026-09"]).toBe("SETTLED");
    expect(entry(both).state).toBe("paid");
  });

  it("uses set shares and gives you the rest", () => {
    const b = bill({
      isShared: true,
      payers: [
        { id: "a", name: "A", share: 50 },
        { id: "b", name: "B" },
      ],
    });
    expect(sharesOf(b, 100)).toMatchObject({
      mine: 25,
      payers: [{ share: 50 }, { share: 25 }],
    });
  });

  it("asks for a varying bill's amount and estimates from last time", () => {
    const e = entry(
      bill({
        isVariable: true,
        amount: 0,
        amountHistory: { "2026-08": 142.18 },
      }),
    );
    expect(e.amount).toBeNull();
    expect(e.estimate).toBe(142.18);
  });
});

describe("monthView", () => {
  const bills = [
    bill({
      name: "Rent",
      amount: 1450,
      dueDayOfMonth: 1,
      statusHistory: { "2026-09": "SETTLED" },
    }),
    bill({ name: "Car insurance", amount: 128, dueDayOfMonth: 5 }),
    bill({ name: "Internet", amount: 70, dueDayOfMonth: 31, autopay: true }),
    bill({
      name: "Registration",
      amount: 96,
      frequency: "yearly",
      anchorDate: "2026-10-03",
    }),
    bill({
      name: "Later",
      amount: 10,
      frequency: "yearly",
      anchorDate: "2026-10-20",
    }),
  ];

  it("sorts the month into overdue, this week and paid, with totals", () => {
    const v = monthView(bills, SEP, TODAY);
    expect(v.overdue.map((e) => e.bill.name)).toEqual(["Car insurance"]);
    // Next month's first week shows too, so nothing due soon hides behind the month change.
    expect(v.thisWeek.map((e) => e.bill.name)).toEqual([
      "Internet",
      "Rent",
      "Registration",
      "Car insurance",
    ]);
    expect(v.paid.map((e) => e.bill.name)).toEqual(["Rent"]);
    expect([v.total, v.paidTotal, v.left]).toEqual([1648, 1450, 198]);
  });

  it("shows a future month's bills as coming up", () => {
    const v = monthView(bills, { y: 2026, m: 9 }, TODAY);
    expect(v.thisWeek).toEqual([]);
    expect(v.later.map((e) => e.bill.name)).toContain("Later");
  });
});
