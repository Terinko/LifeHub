import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EspnLinkForm } from "./EspnLinkForm";

const mutate = vi.fn();
vi.mock("../../queries", () => ({
  useLinkLeague: () => ({ mutate, isPending: false, isError: false }),
}));

describe("EspnLinkForm", () => {
  it("links from a pasted team page link", () => {
    render(<EspnLinkForm onLinked={vi.fn()} />);
    const submit = screen.getByRole("button", { name: "Link league" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Your team page link"), {
      target: {
        value:
          "https://fantasy.espn.com/football/team?leagueId=555&teamId=4&seasonId=2026",
      },
    });
    expect(screen.getByText("League 555, team 4.")).toBeInTheDocument();
    fireEvent.click(submit);
    expect(mutate).toHaveBeenCalledWith(
      {
        platform: "ESPN",
        leagueId: "555",
        espnTeamId: "4",
        nickname: null,
        espnCookies: undefined,
      },
      expect.anything(),
    );
  });

  it("explains what to paste when the link is wrong", () => {
    render(<EspnLinkForm onLinked={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Your team page link"), {
      target: { value: "espn.com/nfl" },
    });
    expect(
      screen.getByText(/doesn't look like a team page/),
    ).toBeInTheDocument();
  });
});
