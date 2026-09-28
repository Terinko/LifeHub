import { describe, expect, it } from "vitest";
import { describeStatus, nameList } from "./status";

describe("nameList", () => {
  it("joins up to three names and counts longer lists", () => {
    expect(nameList(["A"], "your")).toBe("A");
    expect(nameList(["A", "B", "C"], "your")).toBe("A, B and C");
    expect(nameList(["A", "B", "C", "D"], "their")).toBe(
      "their 4 remaining players",
    );
  });
});

describe("describeStatus", () => {
  const live = { phase: "live" as const };

  it("names both sides while everyone is still playing", () => {
    expect(
      describeStatus({
        ...live,
        lead: 13.7,
        myLeft: ["Bijan"],
        oppLeft: ["Pitts", "Kelce"],
      }),
    ).toEqual({
      tone: "ahead",
      text: "You're up 13.7. Still to play: Bijan for you, Pitts and Kelce for them.",
    });
  });

  it("gives an exact target once your opponent is done", () => {
    expect(
      describeStatus({
        ...live,
        lead: -17.7,
        myLeft: ["Cook", "Pitts"],
        oppLeft: [],
      }),
    ).toEqual({
      tone: "behind",
      text: "You need Cook and Pitts to score more than 17.7 combined.",
    });
  });

  it("gives the opponent's ceiling once you're done", () => {
    expect(
      describeStatus({ ...live, lead: 4, myLeft: [], oppLeft: ["Kelce"] }).text,
    ).toBe("Your players are done. You win if Kelce scores under 4.0.");
  });

  it("switches to counts when many players are left", () => {
    expect(
      describeStatus({
        ...live,
        lead: 0,
        myLeft: ["A", "B", "C"],
        oppLeft: ["D", "E"],
      }).text,
    ).toBe("Tied. 3 of yours and 2 of theirs still to play.");
  });

  it("summarizes pregame and final", () => {
    expect(
      describeStatus({
        phase: "pregame",
        lead: 0,
        myLeft: ["A"],
        oppLeft: ["B"],
      }),
    ).toEqual({ tone: "neutral", text: "No games have started yet." });
    expect(
      describeStatus({ phase: "final", lead: -2.5, myLeft: [], oppLeft: [] }),
    ).toEqual({ tone: "behind", text: "You lost by 2.5." });
  });
});
