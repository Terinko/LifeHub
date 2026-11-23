import type { LiftSet } from "@lifehub/shared";
import {
  bestEfforts,
  heartRateDrift,
  samplesFromFit,
  setsFromFit,
  setsFromJson,
  type GarminExerciseSet,
} from "./detail";
import { activityFit } from "./fit";
import { GarminError, garminGet } from "./http";

/** A strength session's working sets: the activity JSON first, then its FIT file. */
export async function liftSets(
  bearer: string,
  activityId: string,
): Promise<LiftSet[]> {
  try {
    const res = await garminGet<{ exerciseSets?: GarminExerciseSet[] }>(
      `/activity-service/activity/${activityId}/exerciseSets`,
      {},
      bearer,
    );
    const sets = setsFromJson(res.exerciseSets ?? []);
    if (sets.length > 0) return sets;
  } catch (error) {
    if (!(error instanceof GarminError)) throw error;
  }
  const fit = await activityFit(bearer, activityId);
  return setsFromFit(fit.setMesgs ?? []);
}

/** Best efforts and heart-rate drift from a run's second-by-second samples. */
export async function runDetail(bearer: string, activityId: string) {
  const fit = await activityFit(bearer, activityId);
  const samples = samplesFromFit(fit.recordMesgs ?? []);
  return {
    bestEfforts: bestEfforts(samples),
    driftPct: heartRateDrift(samples),
  };
}
