export const METERS_PER_MILE = 1609.344;
const FEET_PER_METER = 3.28084;

export const toMiles = (meters: number) => meters / METERS_PER_MILE;

/** 6.24 → "6.2", 1082.4 → "1,082" (whole miles past 100). */
export function formatMiles(miles: number): string {
  return miles >= 100
    ? Math.round(miles).toLocaleString("en-US")
    : (Math.round(miles * 10) / 10).toFixed(1);
}

/** 3725 → "1:02:05", 401 → "6:41". */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** Seconds per mile for a distance and time. */
export const paceSecondsPerMile = (meters: number, seconds: number) =>
  seconds / toMiles(meters);

/** Seconds per mile → "9:05". */
export const formatPace = (secondsPerMile: number) =>
  formatDuration(secondsPerMile);

export const formatFeet = (meters: number) =>
  `${Math.round(meters * FEET_PER_METER).toLocaleString("en-US")} ft`;

const LB_PER_KG = 2.20462;

export const toLb = (kg: number) => kg * LB_PER_KG;

/** 1234.5 → "1,235" */
export const formatWhole = (n: number) => Math.round(n).toLocaleString("en-US");

/** 3725 seconds → "1:02" (hours and minutes). */
export function formatHours(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}
