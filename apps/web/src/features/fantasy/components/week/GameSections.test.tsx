import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { game } from "../../test/fixtures";
import { GameSections } from "./GameSections";

describe("GameSections", () => {
  it("puts live games first and folds finished games away", () => {
    render(
      <GameSections
        games={[game("1", "post"), game("2", "pre"), game("3", "in")]}
      />,
    );
    const names = screen
      .getAllByText(/^Player \d$/)
      .map((el) => el.textContent);
    expect(names).toEqual(["Player 3", "Player 2"]);

    fireEvent.click(
      screen.getByRole("button", { name: "Show 1 finished game" }),
    );
    expect(screen.getByText("Player 1")).toBeInTheDocument();
  });
});
