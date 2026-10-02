import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { playerProfile } from "../../lib/profile";
import { recordBook } from "../../lib/records";
import { g1, g2, g3 } from "../../test/fixtures";
import { ProfileSheet } from "./ProfileSheet";
import { RecordBookCard } from "./RecordBookCard";

describe("ProfileSheet", () => {
  it("shows a career with rivals and comebacks", () => {
    const sam = playerProfile([g1, g2, g3], "PLAYER#s");
    if (!sam) throw new Error("expected a profile");
    render(<ProfileSheet profile={sam} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Sam" })).toBeInTheDocument();
    expect(screen.getAllByText("−$15.00")).toHaveLength(2); // lifetime and nemesis
    expect(screen.getByLabelText("Last 2: lost, won")).toBeInTheDocument();
    expect(screen.getByText("Nemesis")).toBeInTheDocument();
    expect(screen.queryByText("Favorite ATM")).toBeNull();
    expect(
      screen.getByText("Sam rebought in 2 games and came back to win 1 (50%)."),
    ).toBeInTheDocument();
  });
});

describe("RecordBookCard", () => {
  it("opens the game a record was set in", () => {
    const open = vi.fn();
    render(
      <RecordBookCard book={recordBook([g1, g2, g3])} onOpenGame={open} />,
    );
    expect(screen.getByText("Tyler +$20 at $10")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Most buy-ins/ }));
    expect(open).toHaveBeenCalledWith("GAME#3");
  });
});
