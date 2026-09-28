import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { Application } from "@lifehub/shared";
import { ApplicationBoard } from "./ApplicationBoard";

const acme: Application = {
  pk: "USER#1#APPLICATION",
  sk: "a1",
  company: "Acme",
  position: "Engineer",
  location: "Remote",
  status: "Interview",
  dateApplied: "2026-09-01",
  url: "",
  source: "",
  salaryRange: "",
  contact: "",
  notes: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("ApplicationBoard", () => {
  it("puts each card in its status column and moves it on change", () => {
    const onMove = vi.fn();
    render(
      <ApplicationBoard
        applications={[acme]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMove={onMove}
      />,
    );

    const interview = screen.getByRole("region", { name: "Interview" });
    expect(within(interview).getByText("Acme")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Applied" })).getByText(
        "No applications",
      ),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Status of Acme"), {
      target: { value: "Offer" },
    });
    expect(onMove).toHaveBeenCalledWith(acme, "Offer");
  });
});
