import type { HockeyGame, HockeyPoll } from "@lifehub/shared";
import { countdown, dayLabel, easternDate, shiftDay, todayKey } from "./dates";
import { groupGames, periodLabel, resultLabel } from "./games";
import { movement, rankTrend, votesOutside } from "./poll";
import { records } from "./record";

const side = (id: string, name: string, score?: number) => ({
  id,
  name,
  abbr: name.slice(0, 3),
  score,
  periods: [],
});

const game = (
  id: string,
  state: HockeyGame["state"],
  home: [string, string, number?],
  away: [string, string, number?],
  detail = "",
): HockeyGame => ({
  id,
  start: "2026-10-02T23:00Z",
  state,
  detail,
  tv: [],
  neutral: false,
  home: side(...home),
  away: side(...away),
});

describe("dates", () => {
  it("uses the Eastern calendar day", () => {
    // 11 PM Friday in Hamden is already Saturday in UTC.
    expect(easternDate("2026-10-03T03:00Z")).toBe("2026-10-02");
    expect(todayKey(new Date("2026-10-03T03:00Z"))).toBe("20261002");
  });

  it("steps days across month ends and labels them", () => {
    expect(shiftDay("20261031", 1)).toBe("20261101");
    expect(shiftDay("20261001", -1)).toBe("20260930");
    expect(dayLabel("20261002", "20261002")).toBe("Today");
    expect(dayLabel("20261001", "20261002")).toBe("Yesterday");
    expect(dayLabel("20261003", "20261002")).toBe("Tomorrow");
    expect(dayLabel("20261009", "20261002")).toBe("Fri, Oct 9");
  });

  it("counts down to puck drop and stops at zero", () => {
    const now = new Date("2026-10-02T22:30:00Z").getTime();
    expect(countdown("2026-10-03T20:00:00Z", now)).toEqual({
      days: 0,
      hours: 21,
      minutes: 30,
      seconds: 0,
    });
    expect(countdown("2026-10-01T00:00:00Z", now).hours).toBe(0);
  });
});

describe("games", () => {
  const win = game(
    "1",
    "post",
    ["2514", "Quinnipiac", 10],
    ["160", "New Hampshire", 2],
    "Final",
  );
  const otLoss = game(
    "2",
    "post",
    ["2771", "Merrimack", 3],
    ["2514", "Quinnipiac", 2],
    "Final/OT",
  );
  const tie = game(
    "3",
    "post",
    ["2514", "Quinnipiac", 2],
    ["18", "Cornell", 2],
    "Final/OT",
  );

  it("labels results from the team's side", () => {
    expect(resultLabel(win, "2514")).toBe("W 10–2");
    expect(resultLabel(otLoss, "2514")).toBe("L 2–3 OT");
    expect(resultLabel(tie, "2514")).toBe("T 2–2 OT");
  });

  it("groups live, upcoming and final", () => {
    const live = game("4", "in", ["1", "A"], ["2", "B"]);
    const pre = game("5", "pre", ["3", "C"], ["4", "D"]);
    expect(groupGames([win, live, pre])).toEqual({
      live: [live],
      upcoming: [pre],
      final: [win],
    });
  });

  it("names overtime periods", () => {
    expect([0, 2, 3, 4].map(periodLabel)).toEqual(["1", "3", "OT", "2OT"]);
  });

  it("counts overall and conference records", () => {
    expect(records([win, otLoss, tie], "2514", ["Cornell", "Yale"])).toEqual({
      overall: "1-1-1",
      conference: "0-0-1",
    });
  });
});

describe("poll", () => {
  const row = (team: string, rank: number, previous: number | null) => ({
    rank,
    team,
    previous,
    points: 100,
    firstPlaceVotes: 0,
    record: "0-0-0",
  });
  const poll: HockeyPoll = {
    through: "Through Games OCT. 5, 2026",
    seenAt: "2026-10-06T00:00:00Z",
    rows: [row("Quinnipiac", 5, 7)],
    others: [{ team: "Yale", points: 4 }],
    history: [
      {
        through: "Through Games SEP. 21, 2026",
        seenAt: "2026-09-22T00:00:00Z",
        rows: [row("Quinnipiac", 7, 8)],
      },
      {
        through: "Through Games OCT. 5, 2026",
        seenAt: "2026-10-06T00:00:00Z",
        rows: [row("Quinnipiac", 5, 7)],
      },
    ],
  };

  it("reads movement", () => {
    expect(movement(row("A", 5, 7))).toEqual({ kind: "up", by: 2 });
    expect(movement(row("A", 5, 3))).toEqual({ kind: "down", by: 2 });
    expect(movement(row("A", 5, 5))).toEqual({ kind: "same" });
    expect(movement(row("A", 5, null))).toEqual({ kind: "new" });
  });

  it("charts a team's rank by week, led by the poll before", () => {
    expect(rankTrend(poll, "Quinnipiac")).toEqual([
      { label: "Before", rank: 8 },
      { label: "Sep 21", rank: 7 },
      { label: "Oct 5", rank: 5 },
    ]);
    expect(rankTrend(poll, "Yale").map((p) => p.rank)).toEqual([
      null,
      null,
      null,
    ]);
    expect(votesOutside(poll, "Yale")).toBe(4);
  });
});
