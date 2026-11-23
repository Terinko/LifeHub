import { z } from "zod";

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
 * Where the caller's Garmin stands: "connected" (real runs), "not-connected"
 * (they can connect) or "unavailable" (the Garmin app keys aren't set up yet).
 */
export type RunGarminStatus = "connected" | "not-connected" | "unavailable";

/**
 * GET /run: every run from the start of last year to now, plus VO2 max
 * readings. Until the caller connects Garmin, the runs are made-up examples
 * (source "example") so the page can say so.
 */
export type RunData = {
  source: "garmin" | "example";
  garmin: RunGarminStatus;
  /** ISO time Garmin last sent data, when connected. */
  syncedAt?: string;
  activities: RunActivity[];
  vo2Max: RunVo2Reading[];
};

/** POST /run/garmin/connect → where to send the browser to sign in to Garmin. */
export type RunGarminConnectStart = { url: string };

/** The Run page's own address; Garmin sends the browser back here after consent. */
export const runGarminConnectSchema = z.object({
  redirectUri: z.url().max(300),
});

/** POST /run/garmin/callback: what Garmin put on the redirect back. */
export const runGarminCallbackSchema = z.object({
  code: z.string().min(1).max(4000),
  state: z.string().regex(/^[A-Za-z0-9_-]{20,128}$/),
  redirectUri: z.url().max(300),
});
export type RunGarminCallback = z.infer<typeof runGarminCallbackSchema>;
