import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { game, seat } from "../../test/fixtures";
import { SettleSheet } from "./SettleSheet";

const endGame = vi.fn();
const saveChips = vi.fn();
vi.mock("../../queries", () => ({
  useEndGame: () => ({ mutate: endGame, isPending: false, error: null }),
  useSaveChips: () => ({ mutate: saveChips }),
}));

const table = game("a", {
  "PLAYER#1": seat("Tyler", 2),
  "PLAYER#2": seat("Sam", 1),
});

describe("SettleSheet", () => {
  it("stays locked until the chips add up, then sends the counts", () => {
    render(
      <SettleSheet
        game={table}
        canCountStats
        onClose={vi.fn()}
        onSettled={vi.fn()}
      />,
    );
    const settle = screen.getByRole("button", { name: "Settle up" });
    expect(settle).toBeDisabled();
    expect(screen.getByText("3,000 missing")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Tyler"), {
      target: { value: "3500" },
    });
    expect(screen.getByText("+$15.00")).toBeInTheDocument();
    expect(screen.getByText(/Count Sam to finish/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Sam"), { target: { value: "0" } });
    expect(screen.getByText("500 extra")).toBeInTheDocument();
    expect(settle).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Sam"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Tyler"), {
      target: { value: "2,500" },
    });
    fireEvent.change(screen.getByLabelText("Sam"), {
      target: { value: "500" },
    });
    fireEvent.blur(screen.getByLabelText("Sam"));
    expect(saveChips).toHaveBeenCalledWith({
      sk: "GAME#a",
      id: "PLAYER#2",
      chips: 500,
    });
    expect(screen.getByText("All counted")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Save to history"));
    expect(screen.queryByLabelText("Count toward the Hall of Fame")).toBeNull();
    fireEvent.click(settle);
    expect(endGame).toHaveBeenCalledWith(
      {
        sk: "GAME#a",
        finalChips: { "PLAYER#1": 2500, "PLAYER#2": 500 },
        saveToHistory: false,
        includeInStats: true,
      },
      expect.anything(),
    );
  });

  it("hides the Hall of Fame choice from people without stats", () => {
    render(
      <SettleSheet
        game={table}
        canCountStats={false}
        onClose={vi.fn()}
        onSettled={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText("Count toward the Hall of Fame")).toBeNull();
  });
});
