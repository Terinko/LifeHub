import { describe, expect, it } from "vitest";
import { done, g1, g2, g3 } from "../test/fixtures";
import { brokenRecords, describeRecord, nightAwards, recapText } from "./recap";

describe("nightAwards", () => {
  it("hands out tonight's awards", () => {
    const night = done("n", "2026-10-02T04:00:00Z", {
      "PLAYER#j": ["Jordan", 4, 62],
      "PLAYER#a": ["Alex", 3, -30],
      "PLAYER#t": ["Tyler", 1, -22],
      "PLAYER#m": ["Mike", 1, -10],
    });
    expect(nightAwards(night).map((a) => [a.title, a.name, a.detail])).toEqual([
      ["Big Winner", "Jordan", "+$62"],
      ["Top Donor", "Alex", "−$30"],
      ["Comeback Kid", "Jordan", "won after 3 rebuys"],
      ["Tilt of the Night", "Jordan", "4 buy-ins"],
    ]);
  });

  it("skips awards nobody earned", () => {
    const even = done("e", "2026-10-02T04:00:00Z", {
      "PLAYER#a": ["Ann", 1, 0],
      "PLAYER#b": ["Bob", 1, 0],
    });
    expect(nightAwards(even)).toEqual([]);
  });
});

describe("brokenRecords", () => {
  it("calls out records this game beat, not first-time records", () => {
    const night = done("n", "2026-10-02T04:00:00Z", {
      "PLAYER#j": ["Jordan", 2, 30],
      "PLAYER#s": ["Sam", 2, -30],
    });
    const broken = brokenRecords([g1, g2, g3], night);
    expect(broken.map((r) => r.key)).toEqual(["biggestWin", "biggestLoss"]);
    const [first] = broken;
    expect(first && describeRecord(first)).toBe(
      "Jordan's +$30 beats Tyler's +$20 from Sat, Aug 1.",
    );
    expect(brokenRecords([], night)).toEqual([]);
  });

  it("writes the recap for the group chat", () => {
    const text = recapText(
      { ...g1, notes: "Sam went on tilt" },
      nightAwards(g1),
      [],
    );
    expect(text).toBe(
      [
        "Poker, Sat, Aug 1",
        "Big Winner: Tyler (+$20)",
        "Top Donor: Sam (−$20)",
        "Tilt of the Night: Sam (3 buy-ins)",
        "",
        "Sam pays Tyler $20.00",
        "",
        "Sam went on tilt",
      ].join("\n"),
    );
  });
});
