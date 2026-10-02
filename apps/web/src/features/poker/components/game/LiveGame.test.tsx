import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { game, seat } from "../../test/fixtures";
import { LiveGame } from "./LiveGame";

const buyIn = vi.fn();
const cashOut = vi.fn();
const undoCashOut = vi.fn();
const idle = { isPending: false, error: null };
vi.mock("../../queries", () => ({
  useBuyIn: () => ({ ...idle, mutate: buyIn }),
  useDeleteItem: () => ({ ...idle, mutate: vi.fn() }),
  useUndoCashOut: () => ({ ...idle, mutate: undoCashOut }),
  useCashOut: () => ({ ...idle, mutate: cashOut }),
}));

const table = game("1", {
  "PLAYER#a": seat("Ann", 2),
  "PLAYER#b": seat("Bob", 1),
  "PLAYER#c": seat("Cat", 2, {
    finalChips: 2500,
    cashedOutAt: "2026-09-27T03:52:00.000Z",
  }),
});

describe("LiveGame", () => {
  it("offers an undo after adding a buy-in", () => {
    render(<LiveGame game={table} onSettle={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Add a buy-in for Bob"));
    expect(buyIn).toHaveBeenLastCalledWith(
      expect.objectContaining({ playerId: "PLAYER#b", delta: 1 }),
    );
    expect(screen.getByText("Added a buy-in for Bob")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(buyIn).toHaveBeenLastCalledWith(
      expect.objectContaining({ playerId: "PLAYER#b", delta: -1 }),
    );
    expect(screen.queryByText("Added a buy-in for Bob")).toBeNull();
  });

  it("locks a cashed-out player and counts who's still playing", () => {
    render(<LiveGame game={table} onSettle={vi.fn()} />);
    expect(screen.queryByLabelText("Add a buy-in for Cat")).toBeNull();
    expect(screen.getByText("Cashed out")).toBeInTheDocument();
    // 2,500 chips at $10 per 1,000 is $25 back on $20 in.
    expect(screen.getByText("+$5.00")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Settle up · 2 still playing" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Put Cat back in the game"));
    expect(undoCashOut).toHaveBeenCalledWith({ sk: "GAME#1", id: "PLAYER#c" });
  });

  it("cashes someone out with their chip count", () => {
    render(<LiveGame game={table} onSettle={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Cash someone out" }));
    const sheet = screen.getByRole("dialog", { name: "Cash someone out" });
    expect(sheet).toHaveTextContent("Ann");
    expect(sheet).not.toHaveTextContent("Cat");
    fireEvent.click(within(sheet).getByRole("button", { name: "Ann" }));
    fireEvent.change(screen.getByPlaceholderText("Chips"), {
      target: { value: "1500" },
    });
    expect(screen.getByText("−$5.00")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cash out Ann" }));
    expect(cashOut).toHaveBeenCalledWith(
      { sk: "GAME#1", id: "PLAYER#a", chips: 1500 },
      expect.anything(),
    );
  });
});
