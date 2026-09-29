import { describe, expect, it } from "vitest";
import { bill, TODAY } from "../test/fixtures";
import { overview } from "./overview";

describe("overview", () => {
  it("adds up a typical month with your share and yearly bills", () => {
    const o = overview(
      [
        bill({ name: "Rent", amount: 1200 }),
        bill({
          name: "Phone",
          amount: 180,
          isShared: true,
          payers: [
            { id: "m", name: "Mom" },
            { id: "d", name: "Dad" },
          ],
        }),
        bill({
          name: "Electric",
          isVariable: true,
          amount: 0,
          amountHistory: { "2026-07": 100, "2026-08": 140 },
        }),
        bill({
          name: "Prime",
          amount: 120,
          frequency: "yearly",
          anchorDate: "2027-02-01",
        }),
        bill({ name: "Ended", amount: 50, endDate: "2026-01" }),
      ],
      TODAY,
    );
    expect(o.rows.map((r) => [r.bill.name, r.perMonth, r.note])).toEqual([
      ["Rent", 1200, null],
      ["Electric", 120, "avg"],
      ["Phone", 60, "your share"],
    ]);
    expect(o.perMonth).toBe(1390);
    expect(o.perYear).toBe(16680);
  });

  it("counts payments left on a loan", () => {
    const loan = bill({
      name: "Car loan",
      amount: 389,
      dueDayOfMonth: 15,
      startMonth: "2026-09",
      endDate: "2027-04",
      statusHistory: { "2026-09": "PAID" },
    });
    const [p] = overview([loan], TODAY).payoffs;
    expect(p).toMatchObject({ left: 7, made: 1, remaining: 2723 });
  });

  it("marks months where every bill got paid", () => {
    const b = bill({
      startMonth: "2026-07",
      statusHistory: { "2026-07": "PAID" },
    });
    const marks = overview([b], TODAY)
      .marks.slice(-3)
      .map((m) => m.mark);
    expect(marks).toEqual(["all", "missed", "now"]);
  });
});
