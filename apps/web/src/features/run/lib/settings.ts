/**
 * Easy runs are the ones whose average heart rate lands in this band; their
 * pace at the same effort shows whether the aerobic base is improving.
 */
export const EASY_HR = { low: 140, high: 150 } as const;

/** The heart rate the progression and insight cards quote easy pace at. */
export const REFERENCE_HR = 145;

/** Recommended working sets per muscle group per week, drawn as a guide band. */
export const SET_RANGE = { low: 10, high: 20 } as const;

/** Lifts with an estimated 1-rep max trend, as LifeHub names them. */
export const TRACKED_LIFTS = [
  "Bench press",
  "Row",
  "Preacher curl",
  "Hammer curl",
  "Weighted pull-up",
] as const;

/** Weeks of history on the trend charts. */
export const TREND_WEEKS = 16;
