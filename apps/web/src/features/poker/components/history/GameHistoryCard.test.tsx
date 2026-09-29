import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { done } from "../../test/fixtures";
import { GameHistoryCard } from "./GameHistoryCard";

const g = done(
  "a",
  "2026-09-26T23:00:00",
  {
    "PLAYER#1": ["Tyler", 2, -10],
    "PLAYER#2": ["Casey", 1, 10],
  },
  {
    settlements: [
      {
        from: "Tyler",
        fromId: "PLAYER#1",
        to: "Casey",
        toId: "PLAYER#2",
        amount: 10,
      },
    ],
  },
);

describe("GameHistoryCard", () => {
  it("shows my result and who won, then everyone when opened", () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <GameHistoryCard
        game={g}
        myIds={["PLAYER#1"]}
        expanded={false}
        onToggle={onToggle}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("You −$10")).toBeInTheDocument();
    expect(
      screen.getByText("$10 buy-in · 2 players · Casey won $10"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    expect(onToggle).toHaveBeenCalled();

    rerender(
      <GameHistoryCard
        game={g}
        myIds={["PLAYER#1"]}
        expanded
        onToggle={onToggle}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("+$10.00")).toBeInTheDocument();
    expect(screen.getByText("−$10.00")).toBeInTheDocument();
    expect(screen.getByText("$10.00")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete the Sat, Sep 26 game" }),
    ).toBeInTheDocument();
  });
});
