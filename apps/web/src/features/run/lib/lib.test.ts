import { describe, expect, it } from "vitest";
import type { RunActivity } from "@lifehub/shared";
import { dayDate, fullDate, isoWeek, localToday, weekStart } from "./dates";
import { milesByDay } from "./days";
import { easyPaceByWeek, paceGain } from "./easyPace";
import { paceChart } from "./paceChart";
import { personalRecords } from "./records";
import { formatDuration, formatMiles, METERS_PER_MILE } from "./units";
import { showsLabel, weekAxis, weeklyTotals } from "./weeks";

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
