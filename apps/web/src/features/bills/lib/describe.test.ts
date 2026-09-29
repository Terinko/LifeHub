import { describe, expect, it } from "vitest";
import { bill, SEP, TODAY } from "../test/fixtures";
import { detailText, statusText } from "./describe";
import { entriesIn } from "./month";

const only = (fields: Parameters<typeof bill>[0]) => {
  const [e] = entriesIn([bill(fields)], SEP, TODAY);
  if (!e) throw new Error("no entry");
  return e;
};

describe("row text", () => {
  it("calls a missed bill late, not upcoming", () => {
    expect(statusText(only({ dueDayOfMonth: 5 }))).toEqual({
      text: "24 days late",
      tone: "rose",
    });
  });

  it("says when an autopay bill will go out", () => {
    expect(statusText(only({ dueDayOfMonth: 30, autopay: true })).text).toBe(
      "Autopays tomorrow",
    );
  });

  it("explains a due date moved to the end of a short month", () => {
    expect(detailText(only({ dueDayOfMonth: 31 }))).toBe("due the 31st");
  });

  it("names who still owes you", () => {
    const e = only({
      amount: 180,
      dueDayOfMonth: 28,
      isShared: true,
      statusHistory: { "2026-09": "PAID" },
      payers: [
        { id: "m", name: "Mom", paidHistory: { "2026-09": "2026-09-28" } },
        { id: "d", name: "Dad" },
      ],
    });
    expect(statusText(e)).toEqual({ text: "Dad owes you $60", tone: "sky" });
  });
});
