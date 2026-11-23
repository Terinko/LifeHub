import type { LiftSet, RunBestEfforts } from "@lifehub/shared";
import { exerciseName, muscleFor } from "./exercises";
import { fitExerciseName, type RecordMesg, type SetMesg } from "./fit";

// Turns Garmin's per-activity detail into what LifeHub stores: working sets
// for a strength session, and best efforts plus heart-rate drift for a run.

/** One set from the activity JSON's exerciseSets list. */
export type GarminExerciseSet = {
  setType?: string;
  repetitionCount?: number | null;
  /** Grams */
  weight?: number | null;
  exercises?: { category?: string; name?: string | null }[];
};

const kg = (n: number | null | undefined) =>
  n && n > 0 ? Math.round(n * 10) / 10 : undefined;

/** Working sets from the activity JSON (weights there are in grams). */
export function setsFromJson(sets: GarminExerciseSet[]): LiftSet[] {
  return sets.flatMap((s) => {
    if (s.setType && s.setType.toUpperCase() !== "ACTIVE") return [];
    const reps = s.repetitionCount ?? 0;
    if (reps <= 0) return [];
    const ex = s.exercises?.[0];
    const category = ex?.category ?? "UNKNOWN";
    const weightKg = kg(s.weight == null ? undefined : s.weight / 1000);
    return [
      {
        exercise: exerciseName(category, ex?.name ?? undefined, weightKg),
        muscle: muscleFor(category),
        reps,
        ...(weightKg ? { weightKg } : {}),
      },
    ];
  });
}

/** Working sets from a FIT file's set messages (weights there are in kg). */
export function setsFromFit(sets: SetMesg[]): LiftSet[] {
  return sets.flatMap((s) => {
    if (s.setType !== "active" && s.setType !== 1) return [];
    const reps = s.repetitions ?? 0;
    if (reps <= 0) return [];
    const rawCategory = s.category?.[0];
    const category = typeof rawCategory === "string" ? rawCategory : "unknown";
    const name = fitExerciseName(category, s.categorySubtype?.[0]);
    const weightKg = kg(s.weight);
    return [
      {
        exercise: exerciseName(category, name, weightKg),
        muscle: muscleFor(category),
        reps,
        ...(weightKg ? { weightKg } : {}),
      },
    ];
  });
}

/** A run's samples: seconds from the start, meters so far, and heart rate. */
export type Sample = { t: number; d: number; hr?: number };

const seconds = (t: RecordMesg["timestamp"]): number =>
  t instanceof Date ? t.getTime() / 1000 : typeof t === "number" ? t : NaN;

export function samplesFromFit(records: RecordMesg[]): Sample[] {
  const first = seconds(records[0]?.timestamp);
  return records.flatMap((r) => {
    const t = seconds(r.timestamp) - first;
    const d = r.distance;
    if (!Number.isFinite(t) || d === undefined || d === null) return [];
    return [{ t, d, ...(r.heartRate ? { hr: r.heartRate } : {}) }];
  });
}

const EFFORTS: [keyof RunBestEfforts, number][] = [
  ["mile", 1609.344],
  ["k5", 5000],
  ["k10", 10000],
  ["half", 21097.5],
];

/**
 * The fastest stretch of each race distance anywhere inside the run, found
 * with a sliding window over the samples (so a fast mile inside a long run
 * counts).
 */
export function bestEfforts(samples: Sample[]): RunBestEfforts {
  const out: RunBestEfforts = {};
  for (const [key, meters] of EFFORTS) {
    let best = Infinity;
    let i = 0;
    for (let j = 0; j < samples.length; j++) {
      const end = samples[j];
      if (!end) continue;
      while (i < j) {
        const next = samples[i + 1];
        if (!next || end.d - next.d < meters) break;
        i++;
      }
      const startSample = samples[i];
      if (!startSample || end.d - startSample.d < meters) continue;
      // Scale the window back to the exact distance.
      const time = ((end.t - startSample.t) * meters) / (end.d - startSample.d);
      if (time < best) best = time;
    }
    if (Number.isFinite(best)) out[key] = Math.round(best);
  }
  return out;
}

// Drift is only meaningful for a steady run of some length.
const MIN_DRIFT_SECONDS = 30 * 60;

/**
 * Aerobic decoupling: how much speed per heartbeat fell from the first half
 * of the run to the second, in percent. Under 5% means the effort was easy
 * enough for the aerobic base to hold. undefined for short runs or without
 * heart rate.
 */
export function heartRateDrift(samples: Sample[]): number | undefined {
  const last = samples.at(-1);
  if (!last || last.t < MIN_DRIFT_SECONDS) return undefined;
  const half = last.t / 2;
  const efficiency = (part: Sample[]) => {
    const a = part[0];
    const b = part.at(-1);
    const hrs = part.flatMap((s) => (s.hr ? [s.hr] : []));
    if (!a || !b || hrs.length < part.length / 2 || b.t <= a.t) return;
    const speed = (b.d - a.d) / (b.t - a.t);
    const hr = hrs.reduce((sum, h) => sum + h, 0) / hrs.length;
    return speed / hr;
  };
  const first = efficiency(samples.filter((s) => s.t <= half));
  const second = efficiency(samples.filter((s) => s.t >= half));
  if (!first || !second) return undefined;
  return Math.round(((first - second) / first) * 1000) / 10;
}
