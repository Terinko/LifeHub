import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { done, player } from "../../test/fixtures";
import { NewGameForm } from "./NewGameForm";

const startGame = vi.fn();
vi.mock("../../queries", () => ({
  useStartGame: () => ({ mutate: startGame, isPending: false, error: null }),
}));

const roster = [player("1", "Tyler"), player("2", "Sam"), player("3", "Alex")];
const last = done(
  "z",
  "2026-09-20T00:00:00Z",
  { "PLAYER#1": ["Tyler", 1, 0], "PLAYER#2": ["Sam", 1, 0] },
  { buyInAmount: 20, chipsPerBuyIn: 500 },
);

describe("NewGameForm", () => {
  it("starts from the last game's stakes and players", () => {
    render(<NewGameForm players={roster} seated={new Set()} games={[last]} />);
    expect(screen.getByLabelText("Buy-in ($)")).toHaveValue("20");
    expect(screen.getByLabelText("Chips per buy-in")).toHaveValue("500");
    fireEvent.click(
      screen.getByRole("button", { name: "Start game · 2 players · $40 pot" }),
    );
    expect(startGame).toHaveBeenCalledWith(
      {
        buyInAmount: 20,
        chipsPerBuyIn: 500,
        players: {
          "PLAYER#1": { name: "Tyler", buyIns: 1, finalChips: null },
          "PLAYER#2": { name: "Sam", buyIns: 1, finalChips: null },
        },
      },
      expect.anything(),
    );
  });

  it("leaves out players at another table and needs two people", () => {
    startGame.mockClear();
    render(
      <NewGameForm
        players={roster}
        seated={new Set(["PLAYER#2"])}
        games={[last]}
      />,
    );
    expect(screen.getByRole("button", { name: /Sam/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Start game" }));
    expect(screen.getByText("Pick at least 2 players.")).toBeInTheDocument();
    expect(startGame).not.toHaveBeenCalled();
  });
});
