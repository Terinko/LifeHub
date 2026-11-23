import type { LiftSession, RunActivity, RunData } from "@lifehub/shared";

/** The three slots of the rotation, in order. */
export type Slot = "back" | "chest" | "run";
export const ROTATION: readonly Slot[] = ["back", "chest", "run"];

export const SLOT_LABEL: Record<Slot, string> = {
  back: "Back + Bi",
  chest: "Chest + Tri",
  run: "Run",
};

/**
 * Which lift day a strength session was: by where its working sets went, or
 * by its name when Garmin didn't send sets. undefined when it can't tell.
 */
export function liftSlot(lift: LiftSession): "back" | "chest" | undefined {
  if (lift.sets?.length) {
    let pull = 0;
    let push = 0;
    for (const s of lift.sets) {
      if (s.muscle === "back" || s.muscle === "biceps") pull += 1;
      if (s.muscle === "chest" || s.muscle === "triceps") push += 1;
    }
    if (pull !== push) return pull > push ? "back" : "chest";
  }
  if (/back|bi(cep)?s?\b|pull/i.test(lift.name)) return "back";
  if (/chest|tri(cep)?s?\b|push|bench/i.test(lift.name)) return "chest";
  return undefined;
}

/** One run or lift on the training calendar. */
export type Session = {
  id: string;
  /** "YYYY-MM-DD" */
  date: string;
  start: string;
  /** "lift" when a strength session's day can't be told. */
  kind: Slot | "lift";
  durationS: number;
  load: number;
  run?: RunActivity;
  lift?: LiftSession;
};

/**
 * Garmin's training load when it sends one, otherwise an estimate from time
 * and heart rate on about the same scale (an hour easy is roughly 60–80).
 */
export function sessionLoad(a: {
  load?: number;
  durationS: number;
  avgHr?: number;
}): number {
  if (a.load !== undefined) return a.load;
  const intensity = a.avgHr ? Math.max(0.5, (a.avgHr - 90) / 40) : 0.8;
  return Math.round((a.durationS / 60) * intensity);
}

/** Every run and lift up to `today`, oldest first. */
export function allSessions(data: RunData, today: string): Session[] {
  const runs = data.activities.map((run): Session => ({
    id: run.id,
    date: run.start.slice(0, 10),
    start: run.start,
    kind: "run",
    durationS: run.durationS,
    load: sessionLoad(run),
    run,
  }));
  const lifts = data.lifts.map((lift): Session => ({
    id: lift.id,
    date: lift.start.slice(0, 10),
    start: lift.start,
    kind: liftSlot(lift) ?? "lift",
    durationS: lift.durationS,
    load: sessionLoad(lift),
    lift,
  }));
  return [...runs, ...lifts]
    .filter((s) => s.date <= today)
    .sort((a, b) => a.start.localeCompare(b.start));
}
