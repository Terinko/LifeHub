import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { matchup } from "../../test/fixtures";
import { MatchupCard } from "./MatchupCard";

describe("MatchupCard", () => {
  it("shows both scores and what's left, and opens the matchup", () => {
    const onOpen = vi.fn();
    render(<MatchupCard matchup={matchup} onOpen={onOpen} />);
    expect(screen.getByText("112.4")).toBeInTheDocument();
    expect(screen.getByText("98.7")).toBeInTheDocument();
    expect(
      screen.getByText(
        "You're up 13.7. Still to play: Bijan Robinson for you, Kyle Pitts for them.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Dynasty Degenerates/ }),
    );
    expect(onOpen).toHaveBeenCalled();
  });

  it("explains a bye week instead of a scoreboard", () => {
    render(
      <MatchupCard
        matchup={{ ...matchup, kind: "bye", opp: null, status: null }}
        onOpen={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Bye week. No opponent this week."),
    ).toBeInTheDocument();
  });
});
