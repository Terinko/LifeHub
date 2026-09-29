import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { bill, SEP, TODAY } from "../../test/fixtures";
import { entriesIn } from "../../lib/month";
import { BillSheet } from "./BillSheet";

const entryOf = (fields: Parameters<typeof bill>[0]) => {
  const [e] = entriesIn([bill(fields)], SEP, TODAY);
  if (!e) throw new Error("no entry");
  return e;
};

describe("BillSheet", () => {
  it("fills in last month's amount and saves it as paid", () => {
    const onChange = vi.fn();
    const onClose = vi.fn();
    const e = entryOf({
      name: "Electric",
      isVariable: true,
      dueDayOfMonth: 18,
      amountHistory: { "2026-08": 142.18 },
    });
    render(
      <BillSheet
        entry={e}
        today={TODAY}
        onClose={onClose}
        onEdit={vi.fn()}
        onChange={onChange}
      />,
    );

    expect(
      screen.getByText("September 2026 · 11 days late"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Save & paid/ }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter September's amount first.",
    );
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Use last month's $142.18" }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Save & paid/ }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        amountHistory: { "2026-08": 142.18, "2026-09": 142.18 },
        statusHistory: { "2026-09": "PAID" },
      }),
      "Electric marked paid",
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("settles a split bill when the last person pays you back", () => {
    const onChange = vi.fn();
    const e = entryOf({
      name: "Phone",
      amount: 180,
      dueDayOfMonth: 28,
      isShared: true,
      statusHistory: { "2026-09": "PAID" },
      payers: [
        { id: "m", name: "Mom", paidHistory: { "2026-09": "2026-09-28" } },
        { id: "d", name: "Dad" },
      ],
    });
    render(
      <BillSheet
        entry={e}
        today={TODAY}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Waiting on Dad")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Mark that Dad paid you back" }),
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ statusHistory: { "2026-09": "SETTLED" } }),
      "Dad paid you back",
    );
  });
});
