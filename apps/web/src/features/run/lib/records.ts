import type { RunActivity } from "@lifehub/shared";
import { METERS_PER_MILE } from "./units";

export const RECORD_DISTANCES = [
  { label: "Mile", meters: METERS_PER_MILE },
  { label: "5K", meters: 5000 },
  { label: "10K", meters: 10000 },
  { label: "Half marathon", meters: 21097.5 },
] as const;

export type RunRecord = {
  label: string;
  /** Seconds, undefined when no run fits this distance yet. */
  seconds: number | undefined;
  date: string | undefined;
};

// A run counts toward a distance when it's that long or up to 10% longer,
// and its time is scaled back to the exact distance at its average pace.
const SLACK = 1.1;

/**
 * Fastest time at each race distance, from whole runs (Garmin's activity
 * summaries don't include splits, so a fast mile inside a long run isn't seen).
 */
export function personalRecords(runs: RunActivity[]): RunRecord[] {
  return RECORD_DISTANCES.map(({ label, meters }) => {
    let best: RunRecord = { label, seconds: undefined, date: undefined };
    for (const run of runs) {
      if (run.distanceM < meters || run.distanceM > meters * SLACK) continue;
      const seconds = (run.durationS * meters) / run.distanceM;
      if (best.seconds === undefined || seconds < best.seconds) {
        best = { label, seconds, date: run.start.slice(0, 10) };
      }
    }
    return best;
  });
}
