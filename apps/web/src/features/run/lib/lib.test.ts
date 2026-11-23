import { describe, expect, it } from "vitest";
import type { RunActivity } from "@lifehub/shared";
import { heatDays, heatLevel } from "./consistency";
import { dayDate, fullDate, isoWeek, localToday, weekStart } from "./dates";
import { milesByDay } from "./days";
import { easyPaceByWeek, paceGain } from "./easyPace";
import { streakKpi, thisWeekKpi, vo2Kpi, yearKpi } from "./kpis";
import { paceChart } from "./paceChart";
import { personalRecords } from "./records";
import { currentStreak, longestStreak } from "./streaks";
import { formatDuration, formatMiles, METERS_PER_MILE } from "./units";
import { showsLabel, weekAxis, weeklyTotals, weeksAtGoal } from "./weeks";

const MON = "2026-11-23";

let nextId = 0;
const run = (
  date: string,
  miles: number,
  pace = 540,
  avgHr?: number,
): RunActivity => ({
  id: String(nextId++),
  start: `${date}T07:00:00`,
  name: "Easy",
  distanceM: miles * METERS_PER_MILE,
  durationS: miles * pace,
  avgHr,
});

describe("dates", () => {
  it("knows the training week and ISO week", () => {
    expect(weekStart("2026-11-29")).toBe(MON);
    expect(weekStart(MON)).toBe(MON);
    expect(isoWeek(MON)).toBe(48);
    expect(isoWeek("2027-01-01")).toBe(53);
    expect(fullDate(MON)).toBe("Mon 23 Nov 2026");
    expect(dayDate(MON)).toBe("Mon 23 Nov");
  });

  it("reads today from the device's own calendar", () => {
    expect(localToday(new Date(2026, 10, 23, 23, 30))).toBe(MON);
  });
});

describe("units", () => {
  it("formats miles and times", () => {
    expect(formatMiles(6.24)).toBe("6.2");
    expect(formatMiles(1082.4)).toBe("1,082");
    expect(formatDuration(401)).toBe("6:41");
    expect(formatDuration(6078)).toBe("1:41:18");
  });
});

describe("streaks", () => {
  const days = milesByDay([
    run("2026-11-20", 3),
    run("2026-11-21", 4),
    run("2026-11-22", 12),
    run("2026-11-10", 5),
    run("2026-11-11", 5),
    run("2026-11-12", 5),
    run("2026-11-13", 5),
  ]);

  it("stays alive until the day is over", () => {
    expect(currentStreak(days, MON)).toBe(3);
    expect(currentStreak(days, "2026-11-24")).toBe(0);
  });

  it("finds the longest stretch", () => {
    expect(longestStreak(days, "2026-01-01", MON)).toBe(4);
  });
});

describe("weeks", () => {
  const days = milesByDay([
    run("2026-11-16", 30),
    run("2026-11-09", 26),
    run("2026-11-02", 10),
    run(MON, 6.2),
  ]);
  const weeks = weeklyTotals(days, MON, 4);

  it("adds up Monday-to-Sunday weeks ending with this one", () => {
    expect(
      weeks.map((w) => [w.start, Math.round(w.miles * 10) / 10, w.current]),
    ).toEqual([
      ["2026-11-02", 10, false],
      ["2026-11-09", 26, false],
      ["2026-11-16", 30, false],
      [MON, 6.2, true],
    ]);
  });

  it("counts finished weeks at goal back from last week", () => {
    expect(weeksAtGoal(weeks, 25)).toBe(2);
  });

  it("rounds the axis above the data and the goal", () => {
    expect(weekAxis(weeks, 25)).toEqual({
      max: 40,
      ticks: [40, 30, 20, 10, 0],
    });
    expect(weekAxis(weeks, 60).max).toBe(80);
  });

  it("always labels this week", () => {
    expect([0, 1, 2, 3].filter((i) => showsLabel(i, 4, 3))).toEqual([0, 3]);
  });
});

describe("summary cards", () => {
  const days = milesByDay([run(MON, 6.2), run("2026-01-05", 1000)]);

  it("tracks this week against the goal", () => {
    const kpi = thisWeekKpi(days, MON, 25);
    expect(kpi).toMatchObject({
      value: "6.2",
      pill: "Day 1 of 7",
      percent: 25,
    });
    expect(kpi.note).toBe("18.8 mi to go · about 2.7 mi/day");
  });

  it("compares the year with goal pace", () => {
    const kpi = yearKpi(days, MON, 1200);
    expect(kpi).toMatchObject({
      value: "1,006",
      pill: "Behind",
      tone: "behind",
    });
  });

  it("shows the streak", () => {
    expect(streakKpi(days, MON)).toMatchObject({ value: "1", unit: "day" });
  });

  it("shows VO2 max and its change, or nothing without readings", () => {
    const readings = [
      { date: "2026-08-03", value: 49 },
      { date: "2026-08-10", value: 49 },
      { date: "2026-11-20", value: 51 },
    ];
    expect(vo2Kpi(readings, "2026-08-10")).toMatchObject({
      value: "51",
      pill: "+2 since Aug",
    });
    expect(vo2Kpi([], "2026-08-10")).toBeUndefined();
  });
});

describe("consistency grid", () => {
  it("steps up with miles and leaves future days blank", () => {
    expect([0, 3, 5, 8, 12].map(heatLevel)).toEqual([0, 1, 2, 3, 4]);
    const grid = heatDays(milesByDay([run(MON, 6)]), MON, 2);
    expect(grid).toHaveLength(14);
    expect(grid[0]?.date).toBe("2026-11-16");
    expect(grid[7]).toMatchObject({ date: MON, level: 2 });
    expect(grid[8]?.level).toBeUndefined();
  });
});

describe("easy pace", () => {
  const runs = [
    run("2026-11-02", 5, 570, 145),
    run("2026-11-03", 7, 470, 165), // tempo: outside the band
    run(MON, 5, 545, 142),
  ];

  it("averages easy-band runs by week", () => {
    const points = easyPaceByWeek(runs, { low: 140, high: 150 }, MON, 4);
    expect(points.map((p) => [p.week, Math.round(p.pace)])).toEqual([
      ["2026-11-02", 570],
      [MON, 545],
    ]);
    expect(Math.round(paceGain(points))).toBe(25);
  });

  it("draws faster paces higher", () => {
    const chart = paceChart(
      [
        { week: "2026-11-02", pace: 570 },
        { week: MON, pace: 545 },
      ],
      "2026-11-02",
      4,
    );
    expect(chart.ticks.map((t) => t.pace)).toEqual([540, 560, 580]);
    expect(chart.points[0]?.x).toBe(40);
    expect(chart.points[1]?.x).toBe(520);
    expect(chart.points[1]?.y ?? 0).toBeLessThan(chart.points[0]?.y ?? 0);
  });
});

describe("personal records", () => {
  it("takes the fastest whole run near each distance, scaled to it", () => {
    const records = personalRecords([
      { ...run("2026-10-17", 0), distanceM: 5050, durationS: 1325 },
      { ...run("2026-10-18", 0), distanceM: 8000, durationS: 1800 },
    ]);
    expect(
      records.map((r) => [r.label, r.seconds && Math.round(r.seconds), r.date]),
    ).toEqual([
      ["Mile", undefined, undefined],
      ["5K", 1312, "2026-10-17"],
      ["10K", undefined, undefined],
      ["Half marathon", undefined, undefined],
    ]);
  });
});
