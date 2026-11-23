import type { LiftSession, LiftSet, Muscle } from "@lifehub/shared";
import { liftSlot } from "./sessions";
import { toLb } from "./units";

const dateOf = (lift: LiftSession) => lift.start.slice(0, 10);

/** Lifts with sets, oldest first. */
const withSets = (lifts: LiftSession[]) =>
  lifts
    .filter((l) => l.sets?.length)
    .sort((a, b) => a.start.localeCompare(b.start));

export const MUSCLES: { key: Muscle; label: string }[] = [
  { key: "back", label: "Back" },
  { key: "biceps", label: "Biceps" },
  { key: "chest", label: "Chest" },
  { key: "triceps", label: "Triceps" },
  { key: "shoulders", label: "Shoulders" },
  { key: "legs", label: "Legs" },
  { key: "core", label: "Core" },
];

/** Working sets per muscle group from `from` to `to`. */
export function setsPerMuscle(
  lifts: LiftSession[],
  from: string,
  to: string,
): Map<Muscle, number> {
  const counts = new Map<Muscle, number>();
  for (const lift of lifts) {
    const day = dateOf(lift);
    if (day < from || day > to) continue;
    for (const s of lift.sets ?? [])
      counts.set(s.muscle, (counts.get(s.muscle) ?? 0) + 1);
  }
  return counts;
}

/**
 * Estimated 1-rep max in lb from one set (Epley). Sets over 12 reps say
 * little about a max and are left out.
 */
export function estimatedMax(set: LiftSet): number | undefined {
  if (!set.weightKg || set.reps > 12) return undefined;
  return toLb(set.weightKg) * (1 + set.reps / 30);
}

export type MaxPoint = { date: string; lb: number };

/** The best estimated max of `exercise` in each session that had it. */
export function maxTrend(lifts: LiftSession[], exercise: string): MaxPoint[] {
  return withSets(lifts).flatMap((lift) => {
    const best = Math.max(
      0,
      ...(lift.sets ?? [])
        .filter((s) => s.exercise === exercise)
        .map((s) => estimatedMax(s) ?? 0),
    );
    return best > 0 ? [{ date: dateOf(lift), lb: best }] : [];
  });
}

/** Pounds moved in a session: weight × reps over every working set. */
export const volumeLb = (lift: LiftSession) =>
  (lift.sets ?? []).reduce((t, s) => t + toLb(s.weightKg ?? 0) * s.reps, 0);

export type VolumePoint = { date: string; lb: number };

/** Volume of the last `count` sessions of one lift day. */
export function volumeTrend(
  lifts: LiftSession[],
  slot: "back" | "chest",
  count = 12,
): VolumePoint[] {
  return withSets(lifts)
    .filter((l) => liftSlot(l) === slot)
    .slice(-count)
    .map((l) => ({ date: dateOf(l), lb: volumeLb(l) }));
}

/** The heaviest set of an exercise in a session (weight first, then reps). */
function topSet(sets: LiftSet[], exercise: string): LiftSet | undefined {
  let top: LiftSet | undefined;
  for (const s of sets) {
    if (s.exercise !== exercise) continue;
    const w = s.weightKg ?? 0;
    const tw = top?.weightKg ?? 0;
    if (!top || w > tw || (w === tw && s.reps > top.reps)) top = s;
  }
  return top;
}

export type ExerciseLine = {
  exercise: string;
  /** "4 × 8 @ 185" */
  summary: string;
  /** Against the last session with this exercise: "+5 lb", "+1 rep", "same", "new". */
  change: string;
  tone: "up" | "same" | "down";
};

const lbText = (kg: number | undefined) =>
  kg ? String(Math.round(toLb(kg))) : "body";

/** The newest session with sets, each exercise's top set against the time before. */
export function lastSession(lifts: LiftSession[]) {
  const sessions = withSets(lifts);
  const last = sessions.at(-1);
  if (!last?.sets) return undefined;
  const earlier = sessions.slice(0, -1).reverse();
  const exercises = [...new Set(last.sets.map((s) => s.exercise))];
  const lines = exercises.map((exercise): ExerciseLine => {
    const sets = (last.sets ?? []).filter((s) => s.exercise === exercise);
    const top = topSet(sets, exercise);
    const before = earlier.find((l) =>
      l.sets?.some((s) => s.exercise === exercise),
    );
    const prev = before && topSet(before.sets ?? [], exercise);
    const reps = top?.reps ?? 0;
    const summary = `${sets.length} × ${reps} @ ${lbText(top?.weightKg)}`;
    if (!top || !prev) return { exercise, summary, change: "new", tone: "up" };
    const dLb = Math.round(toLb(top.weightKg ?? 0) - toLb(prev.weightKg ?? 0));
    const dReps = top.reps - prev.reps;
    if (dLb !== 0)
      return {
        exercise,
        summary,
        change: `${dLb > 0 ? "+" : "−"}${Math.abs(dLb)} lb`,
        tone: dLb > 0 ? "up" : "down",
      };
    if (dReps !== 0)
      return {
        exercise,
        summary,
        change: `${dReps > 0 ? "+" : "−"}${Math.abs(dReps)} rep${Math.abs(dReps) === 1 ? "" : "s"}`,
        tone: dReps > 0 ? "up" : "down",
      };
    return { exercise, summary, change: "same", tone: "same" };
  });
  return { session: last, lines };
}

export type LiftRecord = {
  exercise: string;
  /** "205 × 6" */
  best: string | undefined;
  date: string | undefined;
};

/** Each lift's best set by estimated max. */
export function liftRecords(
  lifts: LiftSession[],
  exercises: readonly string[],
): LiftRecord[] {
  return exercises.map((exercise) => {
    let best: { e: number; set: LiftSet; date: string } | undefined;
    for (const lift of lifts)
      for (const set of lift.sets ?? []) {
        if (set.exercise !== exercise) continue;
        const e = estimatedMax(set) ?? 0;
        if (e > 0 && (!best || e > best.e))
          best = { e, set, date: dateOf(lift) };
      }
    return {
      exercise,
      best: best && `${lbText(best.set.weightKg)} × ${best.set.reps}`,
      date: best?.date,
    };
  });
}
