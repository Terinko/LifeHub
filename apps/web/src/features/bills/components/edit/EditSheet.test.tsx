import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TODAY } from "../../test/fixtures";
import { EditSheet } from "./EditSheet";

describe("EditSheet", () => {
  it("adds a yearly bill with autopay", () => {
    const onSave = vi.fn();
    render(
      <EditSheet
        bill={null}
        today={TODAY}
        onClose={vi.fn()}
        onSave={onSave}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Car registration" },
    });
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "96" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Yearly" }));
    fireEvent.change(screen.getByLabelText("Next due"), {
      target: { value: "2026-10-03" },
    });
    expect(screen.getByText("Then every year on Oct 3.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: /Autopay/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add bill" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Car registration",
        amount: 96,
        frequency: "yearly",
        anchorDate: "2026-10-03",
        autopay: true,
      }),
    );
  });

  it("shows what's wrong instead of saving", () => {
    const onSave = vi.fn();
    render(
      <EditSheet
        bill={null}
        today={TODAY}
        onClose={vi.fn()}
        onSave={onSave}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add bill" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Give the bill a name.",
    );
    expect(onSave).not.toHaveBeenCalled();
  });
});
