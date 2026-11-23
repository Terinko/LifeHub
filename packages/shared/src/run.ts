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
};

/** One VO2 max reading from the watch. */
export type RunVo2Reading = {
  /** "YYYY-MM-DD" */
  date: string;
  value: number;
};

/**
 * Where the caller stands with Garmin: "connected" (these are their runs),
 * "available" (the Personal API key is set up and unclaimed, and the caller
 * is an admin who can claim it) or "unavailable" (example runs only).
 */
export type RunGarminStatus = "connected" | "available" | "unavailable";

/**
 * GET /run: every run from the start of last year to now, plus VO2 max
 * readings. Until the caller's Garmin is connected, the runs are made-up
 * examples (source "example") so the page can say so.
 */
export type RunData = {
  source: "garmin" | "example";
  garmin: RunGarminStatus;
  /** ISO time the runs were last copied from Garmin, when connected. */
  syncedAt?: string;
  activities: RunActivity[];
  vo2Max: RunVo2Reading[];
};
