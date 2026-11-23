import { describe, expect, it } from "vitest";
import type {
  LiftSession,
  LiftSet,
  RunActivity,
  RunData,
} from "@lifehub/shared";
import { buildDashboard } from "./dashboard";
import { dayBeforeEffect, hrvAgainstLoad, MIN_HRV_NIGHTS } from "./insights";
import { estimatedMax, lastSession, maxTrend, setsPerMuscle } from "./lifting";
import { loadByDay, loadRatio } from "./load";
import { walkRotation } from "./rotation";
import { predictSeconds, racePredictions } from "./running";
import { allSessions, liftSlot, sessionLoad, type Session } from "./sessions";
import { METERS_PER_MILE } from "./units";
import { recentDays, weekVsLast } from "./week";

const MON = "2026-11-23";

let nextId = 0;
const set = (
  exercise: string,
  reps: number,
  lb: number,
  muscle: LiftSet["muscle"] = "back",
): LiftSet => ({
  exercise,
  muscle,
  reps,
  weightKg: lb / 2.20462,
});

const lift = (
  date: string,
  sets: LiftSet[],
  name = "Strength",
): LiftSession => ({
  id: String(nextId++),
  start: `${date}T17:00:00`,
  name,
  durationS: 3600,
  load: 50,
  sets,
});

const run = (
  date: string,
  miles = 5,
  pace = 540,
  avgHr = 145,
): RunActivity => ({
  id: String(nextId++),
  start: `${date}T07:00:00`,
  name: "Easy",
  distanceM: miles * METERS_PER_MILE,
  durationS: miles * pace,
  avgHr,
  load: 60,
});

const back = (date: string) =>
  lift(date, [set("Row", 8, 185), set("Hammer curl", 12, 35, "biceps")]);
const chest = (date: string) =>
  lift(date, [
    set("Bench press", 6, 205, "chest"),
    set("Triceps extension", 12, 60, "triceps"),
  ]);

const data = (runs: RunActivity[], lifts: LiftSession[]): RunData => ({
  source: "garmin",
  garmin: "connected",
  activities: runs,
  lifts,
  vo2Max: [],
  hrv: [],
  detailsPending: 0,
});

const sessions = (runs: RunActivity[], lifts: LiftSession[]) =>
  allSessions(data(runs, lifts), MON);

describe("lift days", () => {
  it("tells Back + Bi from Chest + Tri by where the sets went, then by name", () => {
    expect(liftSlot(back(MON))).toBe("back");
    expect(liftSlot(chest(MON))).toBe("chest");
    expect(
      liftSlot({ ...lift(MON, []), sets: undefined, name: "Chest + Tri" }),
    ).toBe("chest");
    expect(
      liftSlot({ ...lift(MON, []), sets: undefined, name: "Strength" }),
    ).toBeUndefined();
  });

  it("estimates load from time and heart rate when Garmin sends none", () => {
    expect(sessionLoad({ load: 42, durationS: 60 })).toBe(42);
    expect(sessionLoad({ durationS: 3600, avgHr: 130 })).toBe(60);
  });
});

describe("rotation", () => {
  it("moves on in order, and rest days just push the next session back", () => {
    const r = walkRotation(
      sessions([run("2026-11-20")], [back("2026-11-16"), chest("2026-11-18")]),
    );
    expect(r.entries.map((e) => [e.slot, e.status])).toEqual([
      ["back", "done"],
      ["chest", "done"],
      ["run", "done"],
    ]);
    expect(r.next).toBe("back");
  });

  it("marks the due session skipped when a different one is done", () => {
    // Run was due on the 19th, but Back + Bi was done instead.
    const r = walkRotation(
      sessions(
        [],
        [back("2026-11-17"), chest("2026-11-18"), back("2026-11-19")],
      ),
    );
    expect(r.entries.map((e) => [e.date, e.slot, e.status])).toEqual([
      ["2026-11-17", "back", "done"],
      ["2026-11-18", "chest", "done"],
      ["2026-11-19", "run", "skipped"],
      ["2026-11-19", "back", "done"],
    ]);
    expect(r.next).toBe("chest");
  });

  it("counts a lift it can't name as the lift that was due", () => {
    const unnamed = { ...lift("2026-11-18", []), sets: undefined };
    const r = walkRotation(sessions([], [back("2026-11-17"), unnamed]));
    expect(r.entries.at(-1)).toMatchObject({ slot: "chest", status: "done" });
  });
});

describe("load", () => {
  it("compares the last 7 days with the 4-week weekly average", () => {
    const days = new Map<string, number>();
    for (let i = 0; i < 28; i++) {
      const d = new Date(Date.UTC(2026, 9, 27 + i)).toISOString().slice(0, 10);
      days.set(d, 10);
    }
    expect(loadRatio(days, "2026-11-23")).toBeCloseTo(1, 5);
    days.set("2026-11-23", 80);
    expect(loadRatio(days, "2026-11-23")).toBeGreaterThan(1.3);
    expect(loadRatio(new Map(), MON)).toBeUndefined();
  });

  it("adds runs and lifts on the same day", () => {
    const s = sessions([run(MON)], [back(MON)]);
    expect(loadByDay(s).get(MON)).toBe(110);
    const strip = recentDays(s, MON);
    expect(strip).toHaveLength(14);
    expect(strip.at(-1)).toMatchObject({
      runLoad: 60,
      liftLoad: 50,
      lifted: true,
    });
  });

  it("compares this week with last week up to the same day", () => {
    const s = sessions(
      [run(MON, 6), run("2026-11-16", 4), run("2026-11-18", 10)],
      [back("2026-11-16")],
    );
    const { now, last } = weekVsLast(s, MON);
    expect(Math.round(now.miles)).toBe(6);
    expect(Math.round(last.miles)).toBe(4);
    expect(last.lifts).toBe(1);
    expect(last.sets).toBe(2);
    expect(Math.round(last.volumeLb)).toBe(185 * 8 + 35 * 12);
  });
});

describe("lifting", () => {
  it("estimates a 1-rep max from a set, ignoring high-rep sets", () => {
    expect(estimatedMax(set("Bench press", 6, 200))).toBeCloseTo(240, 0);
    expect(estimatedMax(set("Bench press", 15, 100))).toBeUndefined();
  });

  it("tracks the best set per session and counts sets per muscle", () => {
    const lifts = [
      back("2026-11-16"),
      lift(MON, [set("Row", 8, 195), set("Row", 6, 205)]),
    ];
    expect(maxTrend(lifts, "Row").map((p) => Math.round(p.lb))).toEqual([
      234, 247,
    ]);
    const counts = setsPerMuscle(lifts, "2026-11-16", "2026-11-22");
    expect(counts.get("back")).toBe(1);
    expect(counts.get("biceps")).toBe(1);
  });

  it("compares each exercise's top set with the last time", () => {
    const result = lastSession([
      back("2026-11-16"),
      lift(MON, [
        set("Row", 8, 190),
        set("Hammer curl", 10, 35, "biceps"),
        set("Shrug", 10, 200),
      ]),
    ]);
    expect(result?.lines.map((l) => [l.exercise, l.change, l.tone])).toEqual([
      ["Row", "+5 lb", "up"],
      ["Hammer curl", "−2 reps", "down"],
      ["Shrug", "new", "up"],
    ]);
  });
});

describe("race predictions", () => {
  it("predicts times from VO2 max like the Daniels tables", () => {
    // VDOT 50: about 19:57 for 5K and 3:10:49 for the marathon.
    expect(predictSeconds(50, 5000)).toBeGreaterThan(19 * 60 + 45);
    expect(predictSeconds(50, 5000)).toBeLessThan(20 * 60 + 10);
    expect(predictSeconds(50, 42195)).toBeGreaterThan(3 * 3600 + 8 * 60);
    expect(predictSeconds(50, 42195)).toBeLessThan(3 * 3600 + 14 * 60);
  });

  it("reports how far each prediction moved", () => {
    const [k5] = racePredictions(
      [
        { date: "2026-08-03", value: 48 },
        { date: "2026-11-20", value: 51 },
      ],
      "2026-08-01",
    );
    expect(k5?.label).toBe("5K");
    expect(k5?.change).toBeGreaterThan(30);
    expect(k5?.trend).toHaveLength(2);
  });
});

describe("insights", () => {
  it("compares easy runs after rest with runs after each lift day", () => {
    const runs: RunActivity[] = [];
    const lifts: LiftSession[] = [];
    for (let w = 0; w < 4; w++) {
      const d = (n: number) =>
        new Date(Date.UTC(2026, 9, 5 + w * 7 + n)).toISOString().slice(0, 10);
      lifts.push(back(d(0)));
      runs.push(run(d(1), 5, 560)); // after Back + Bi, slower
      lifts.push(chest(d(2)));
      runs.push(run(d(3), 5, 545)); // after Chest + Tri
      runs.push(run(d(5), 5, 540)); // after a rest day
    }
    const groups = dayBeforeEffect(sessions(runs, lifts), "2026-10-01");
    const pace = Object.fromEntries(
      groups.map((g) => [g.key, Math.round(g.pace)]),
    );
    expect(pace.back).toBeGreaterThan(pace.chest ?? 0);
    expect(pace.chest).toBeGreaterThan(pace.rest ?? 0);
  });

  it("waits for enough HRV nights before calling a pattern", () => {
    const few = hrvAgainstLoad(
      [{ date: MON, value: 55 }],
      new Map(),
      "2026-01-01",
    );
    expect(few.correlation).toBeUndefined();
    const hrv = Array.from({ length: MIN_HRV_NIGHTS }, (_, i) => ({
      date: new Date(Date.UTC(2026, 9, 2 + i * 2)).toISOString().slice(0, 10),
      value: 70 - (i % 4) * 5,
    }));
    const loads = new Map(
      hrv.map((h, i) => [
        new Date(Date.UTC(2026, 9, 1 + i * 2)).toISOString().slice(0, 10),
        (i % 4) * 30,
      ]),
    );
    expect(hrvAgainstLoad(hrv, loads, "2026-01-01").correlation).toBeCloseTo(
      -1,
      5,
    );
  });
});

describe("the dashboard", () => {
  it("builds every tab from example-shaped data", () => {
    const s: Session[] = sessions([run("2026-11-20")], [back("2026-11-18")]);
    expect(s).toHaveLength(2);
    const dash = buildDashboard(
      data(
        [run("2026-11-20"), run("2026-11-24")],
        [back("2026-11-18"), chest("2026-11-19")],
      ),
      MON,
    );
    expect(dash.week.rotation.next).toBe("back");
    expect(dash.running.recent).toHaveLength(1);
    expect(dash.lifting.records.map((r) => r.exercise)).toEqual([
      "Bench press",
      "Row",
      "Preacher curl",
      "Hammer curl",
      "Weighted pull-up",
    ]);
  });
});
