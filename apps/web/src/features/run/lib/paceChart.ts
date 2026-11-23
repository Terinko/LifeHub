import { daysBetween } from "./dates";
import type { PacePoint } from "./easyPace";

// The pace chart's drawing area inside its 560 × 180 viewBox.
export const PACE_BOX = { left: 40, right: 520, top: 20, bottom: 150 } as const;

export type PaceChart = {
  /** Slowest pace at the bottom, fastest at the top (seconds per mile). */
  ticks: { pace: number; y: number }[];
  points: { x: number; y: number }[];
  /** SVG polyline points, and the same closed down to the axis for the fill. */
  line: string;
  area: string;
};

const STEP = 20;

/**
 * Lays easy-pace points out by week across `weeks` slots starting `first`.
 * Faster (smaller) paces sit higher; the axis spans whole 20-second steps.
 */
export function paceChart(
  points: PacePoint[],
  first: string,
  weeks: number,
): PaceChart {
  const paces = points.map((p) => p.pace);
  const fast = Math.floor(Math.min(...paces) / STEP) * STEP;
  let slow = Math.ceil(Math.max(...paces) / STEP) * STEP;
  if (slow - fast < 2 * STEP) slow = fast + 2 * STEP;
  const { left, right, top, bottom } = PACE_BOX;
  const yFor = (pace: number) =>
    top + ((pace - fast) / (slow - fast)) * (bottom - top);
  const xFor = (week: string) =>
    left +
    (daysBetween(first, week) / 7 / Math.max(1, weeks - 1)) * (right - left);
  const placed = points.map((p) => ({ x: xFor(p.week), y: yFor(p.pace) }));
  const line = placed
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const firstX = placed[0]?.x ?? left;
  const lastX = placed.at(-1)?.x ?? right;
  const mid = (fast + slow) / 2;
  return {
    ticks: [fast, mid, slow].map((pace) => ({ pace, y: yFor(pace) })),
    points: placed,
    line,
    area: `${firstX.toFixed(1)},${bottom} ${line} ${lastX.toFixed(1)},${bottom}`,
  };
}
