import { describe, expect, it } from "vitest";
import { bill } from "../test/fixtures";
import { dayKey } from "./dates";
import { occurrencesIn, startMonthOf } from "./schedule";

const days = (b: ReturnType<typeof bill>, y: number, m: number) =>
  occurrencesIn(b, { y, m }).map((o) => dayKey(o.due));

describe("schedule", () => {
  it("moves a due day past the month's end to its last day", () => {
    const b = bill({ dueDayOfMonth: 31 });
    expect(days(b, 2026, 8)).toEqual(["2026-09-30"]);
    expect(days(b, 2027, 1)).toEqual(["2027-02-28"]);
    expect(occurrencesIn(b, { y: 2026, m: 8 })[0]?.key).toBe("2026-09");
  });

  it("respects the start and end months", () => {
    const b = bill({ startMonth: "2026-09", endDate: "2026-11" });
    expect(days(b, 2026, 7)).toEqual([]);
    expect(days(b, 2026, 10)).toHaveLength(1);
    expect(days(b, 2026, 11)).toEqual([]);
  });

  it("starts old bills at their first recorded month", () => {
    const old = bill({
      startMonth: undefined,
      statusHistory: { "2026-06": "PAID", "2026-08": "SETTLED" },
    });
    expect(startMonthOf(old)).toEqual({ y: 2026, m: 5 });
    expect(startMonthOf(bill({ startMonth: undefined }))).toBeNull();
  });

  it("handles yearly, quarterly, every-2-weeks and one-time bills", () => {
    const yearly = bill({ frequency: "yearly", anchorDate: "2026-10-03" });
    expect(days(yearly, 2026, 9)).toEqual(["2026-10-03"]);
    expect(days(yearly, 2027, 9)).toEqual(["2027-10-03"]);
    expect(days(yearly, 2027, 3)).toEqual([]);
    expect(days(yearly, 2025, 9)).toEqual([]);

    const quarterly = bill({
      frequency: "quarterly",
      anchorDate: "2026-01-31",
    });
    expect(days(quarterly, 2026, 3)).toEqual(["2026-04-30"]);
    expect(days(quarterly, 2026, 4)).toEqual([]);

    const biweekly = bill({ frequency: "biweekly", anchorDate: "2026-09-04" });
    expect(days(biweekly, 2026, 8)).toEqual(["2026-09-04", "2026-09-18"]);
    expect(days(biweekly, 2026, 9)).toEqual([
      "2026-10-02",
      "2026-10-16",
      "2026-10-30",
    ]);

    const once = bill({ frequency: "once", anchorDate: "2026-12-01" });
    expect(days(once, 2026, 11)).toEqual(["2026-12-01"]);
    expect(days(once, 2027, 11)).toEqual([]);
  });
});
