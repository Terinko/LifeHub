import type {
  HrvReading,
  LiftSession,
  LiftSet,
  Muscle,
  RunActivity,
  RunData,
  RunVo2Reading,
} from "@lifehub/shared";

// Made-up training shown until Garmin is connected, so the page has something
// real-looking to draw: the Back + Bi, Chest + Tri, Run rotation with rest
// days and the odd skipped session. Generated from a fixed seed relative to
// today, so it looks the same on every load and always ends with this week.

const MILE = 1609.344;
const LB = 0.45359237;
const DAY_MS = 86_400_000;

/** A small seeded random number generator (mulberry32). */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

type Lift = {
  exercise: string;
  muscle: Muscle;
  sets: number;
  reps: number;
  /** Starting weight in lb (added weight for pull-ups); grows with fitness. */
  lb: number;
};

const BACK_BI: Lift[] = [
  { exercise: "Row", muscle: "back", sets: 4, reps: 8, lb: 165 },
  { exercise: "Weighted pull-up", muscle: "back", sets: 4, reps: 6, lb: 20 },
  { exercise: "Lat pulldown", muscle: "back", sets: 3, reps: 10, lb: 140 },
  { exercise: "Preacher curl", muscle: "biceps", sets: 3, reps: 10, lb: 60 },
  { exercise: "Hammer curl", muscle: "biceps", sets: 3, reps: 12, lb: 30 },
];

const CHEST_TRI: Lift[] = [
  { exercise: "Bench press", muscle: "chest", sets: 4, reps: 6, lb: 185 },
  {
    exercise: "Incline bench press",
    muscle: "chest",
    sets: 3,
    reps: 8,
    lb: 135,
  },
  { exercise: "Flye", muscle: "chest", sets: 3, reps: 12, lb: 35 },
  {
    exercise: "Triceps extension",
    muscle: "triceps",
    sets: 3,
    reps: 12,
    lb: 60,
  },
  { exercise: "Shoulder press", muscle: "shoulders", sets: 3, reps: 8, lb: 50 },
];

/** Rounds to the nearest 5 lb plate step, in kg. */
const plates = (lb: number) =>
  Math.round(Math.round(lb / 5) * 5 * LB * 10) / 10;

function liftSession(
  date: string,
  kind: "back" | "chest",
  fitness: number,
  rand: () => number,
  i: number,
): LiftSession {
  const plan = kind === "back" ? BACK_BI : CHEST_TRI;
  const sets: LiftSet[] = plan.flatMap((lift) =>
    Array.from({ length: lift.sets }, (_, s) => ({
      exercise: lift.exercise,
      muscle: lift.muscle,
      reps: Math.max(
        3,
        lift.reps - (s === lift.sets - 1 && rand() < 0.4 ? 1 : 0),
      ),
      weightKg: plates(lift.lb * (1 + 0.16 * fitness)),
    })),
  );
  return {
    id: `example-lift-${i}`,
    start: `${date}T17:${String(Math.floor(rand() * 50) + 5).padStart(2, "0")}:00`,
    name: kind === "back" ? "Back + Bi" : "Chest + Tri",
    durationS: Math.round((52 + rand() * 14) * 60),
    avgHr: Math.round(108 + rand() * 12),
    load: Math.round(38 + rand() * 22),
    sets,
  };
}

type RunPlan = { name: string; miles: number; pace: number; hr: number };

function runPlan(dow: number, fitness: number, rand: () => number): RunPlan {
  const easy = 615 - 70 * fitness * fitness + rand() * 8;
  const scale = 0.7 + 0.45 * fitness;
  if (dow >= 5)
    return {
      name: "Long run, river loop",
      miles: 10 * scale,
      pace: easy - 15,
      hr: 149,
    };
  if (rand() < 0.35)
    return {
      name: "Tempo 3 × 1.5 mi",
      miles: 6.5 * scale,
      pace: easy - 75,
      hr: 163,
    };
  return { name: "Easy + strides", miles: 5 * scale, pace: easy, hr: 144 };
}

function zonesFor(durationS: number, hr: number): number[] {
  // Mostly zone 2 on easy runs, more zone 3–4 on harder ones.
  const hard = Math.min(1, Math.max(0, (hr - 145) / 20));
  const shares = [
    0.1,
    0.72 - 0.5 * hard,
    0.12 + 0.2 * hard,
    0.05 + 0.25 * hard,
    0.01 + 0.05 * hard,
  ];
  const total = shares.reduce((a, b) => a + b, 0);
  return shares.map((s) => Math.round((durationS * s) / total));
}

function run(
  date: string,
  plan: RunPlan,
  rand: () => number,
  i: number,
): RunActivity {
  const miles = Math.round(plan.miles * (0.9 + rand() * 0.2) * 10) / 10;
  const durationS = Math.round(miles * plan.pace);
  const hr = Math.round(plan.hr + rand() * 4 - 2);
  const effort = (factor: number, meters: number) =>
    miles * MILE >= meters
      ? Math.round((meters / MILE) * plan.pace * factor)
      : undefined;
  return {
    id: `example-${i}`,
    start: `${date}T07:${String(Math.floor(rand() * 50) + 5).padStart(2, "0")}:00`,
    name: plan.name,
    distanceM: Math.round(miles * MILE),
    durationS,
    avgHr: hr,
    elevGainM: Math.round(miles * (8 + rand() * 6)),
    load: Math.round((durationS / 60) * ((hr - 95) / 30)),
    zoneSecs: zonesFor(durationS, hr),
    driftPct:
      durationS >= 1800
        ? Math.round((1.5 + rand() * 4 + (plan.miles > 8 ? 2 : 0)) * 10) / 10
        : undefined,
    bestEfforts: {
      mile: effort(0.9, MILE),
      k5: effort(0.95, 5000),
      k10: effort(0.97, 10000),
      half: effort(0.99, 21097.5),
    },
  };
}

const ROTATION = ["back", "chest", "run"] as const;

/** Every made-up run and lift from Jan 1 last year through `today` ("YYYY-MM-DD"). */
export function exampleTraining(today: string) {
  const rand = seeded(48);
  const first = Date.UTC(+today.slice(0, 4) - 1, 0, 1, 12);
  const last = Date.parse(`${today}T12:00:00Z`);
  const runs: RunActivity[] = [];
  const lifts: LiftSession[] = [];
  let next = 0;
  for (let ms = first; ms <= last; ms += DAY_MS) {
    // About one rest day in four.
    if (rand() < 0.24) continue;
    // Now and then a session is skipped: the next one in the rotation is done instead.
    if (rand() < 0.08) next += 1;
    const kind = ROTATION[next % ROTATION.length] ?? "run";
    next += 1;
    const date = isoDate(ms);
    const fitness = (ms - first) / (last - first);
    if (kind === "run") {
      const dow = (new Date(ms).getUTCDay() + 6) % 7;
      runs.push(run(date, runPlan(dow, fitness, rand), rand, runs.length));
    } else {
      lifts.push(liftSession(date, kind, fitness, rand, lifts.length));
    }
  }
  return { runs, lifts };
}

function exampleVo2(today: string): RunVo2Reading[] {
  const last = Date.parse(`${today}T12:00:00Z`);
  return Array.from({ length: 30 }, (_, i) => ({
    date: isoDate(last - (29 - i) * 7 * DAY_MS),
    value: 47 + Math.floor((i * 4) / 29),
  }));
}

/** HRV on the few nights the watch was worn: roughly one in five. */
function exampleHrv(today: string): HrvReading[] {
  const rand = seeded(7);
  const last = Date.parse(`${today}T12:00:00Z`);
  const out: HrvReading[] = [];
  for (let d = 180; d >= 0; d--) {
    if (rand() > 0.2) continue;
    out.push({
      date: isoDate(last - d * DAY_MS),
      value: Math.round(50 + rand() * 14),
    });
  }
  return out;
}

export function exampleRunData(now: Date): Omit<RunData, "garmin"> {
  // Tyler's calendar day; the example only needs to end on "today".
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
  }).format(now);
  const { runs, lifts } = exampleTraining(today);
  return {
    source: "example",
    syncedAt: now.toISOString(),
    activities: runs,
    lifts,
    vo2Max: exampleVo2(today),
    hrv: exampleHrv(today),
    detailsPending: 0,
  };
}
