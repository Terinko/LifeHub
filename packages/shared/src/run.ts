/** Fastest times inside one run, in seconds, at each race distance it covered. */
export type RunBestEfforts = {
  mile?: number;
  k5?: number;
  k10?: number;
  half?: number;
};

/** One run, as Garmin reports it. Distances in meters, times in seconds. */
export type RunActivity = {
  id: string;
  /** Local wall-clock start where the run happened, "YYYY-MM-DDTHH:mm:ss". */
  start: string;
  name: string;
  distanceM: number;
  durationS: number;
  avgHr?: number;
  elevGainM?: number;
  /** Garmin's training load for the activity (EPOC based). */
  load?: number;
  /** Seconds in heart-rate zones 1–5. */
  zoneSecs?: number[];
  /** Heart-rate drift at the same pace, first half to second half, in percent. */
  driftPct?: number;
  bestEfforts?: RunBestEfforts;
};

/** The muscle group a lift's sets count toward. */
export type Muscle =
  | "back"
  | "biceps"
  | "chest"
  | "triceps"
  | "shoulders"
  | "legs"
  | "core"
  | "other";

/** One working set from a strength activity. */
export type LiftSet = {
  /** Display name, e.g. "Bench press" or "Hammer curl". */
  exercise: string;
  muscle: Muscle;
  reps: number;
  /** Kilograms (added weight for pull-ups); undefined for bodyweight. */
  weightKg?: number;
};

/** One strength activity. */
export type LiftSession = {
  id: string;
  /** Local wall-clock start, "YYYY-MM-DDTHH:mm:ss". */
  start: string;
  name: string;
  durationS: number;
  avgHr?: number;
  load?: number;
  /**
   * Working sets, in order. undefined while they haven't been read from
   * Garmin yet, or when Garmin didn't send any.
   */
  sets?: LiftSet[];
};

/** One VO2 max reading from the watch. */
export type RunVo2Reading = {
  /** "YYYY-MM-DD" */
  date: string;
  value: number;
};

/** Overnight HRV, only on nights the watch was worn. */
export type HrvReading = {
  /** "YYYY-MM-DD" */
  date: string;
  /** Milliseconds */
  value: number;
};

/**
 * Where the caller stands with Garmin: "connected" (this is their data),
 * "available" (the Personal API key is set up and unclaimed, and the caller
 * is an admin who can claim it) or "unavailable" (example data only).
 */
export type RunGarminStatus = "connected" | "available" | "unavailable";

/**
 * GET /run: every run and strength session from the start of last year to
 * now, plus VO2 max and HRV readings. Until the caller's Garmin is
 * connected, the data is made up (source "example") so the page can say so.
 */
export type RunData = {
  source: "garmin" | "example";
  garmin: RunGarminStatus;
  /** ISO time the data was last copied from Garmin, when connected. */
  syncedAt?: string;
  /** Why the latest copy from Garmin failed; the stored data is shown instead. */
  syncError?: string;
  activities: RunActivity[];
  lifts: LiftSession[];
  vo2Max: RunVo2Reading[];
  hrv: HrvReading[];
  /** Activities whose sets or second-by-second detail haven't been read yet. */
  detailsPending: number;
};

/** One line of the admin data check: what Garmin sent for one thing. */
export type GarminCheckLine = {
  label: string;
  ok: boolean;
  detail: string;
};

/** GET /run/garmin/check: what Garmin returns for this account. */
export type GarminCheck = { lines: GarminCheckLine[] };
