// Layout and color for the 10-day forecast's low-to-high range bars.

type Rgb = [number, number, number];

const STOPS: [number, Rgb][] = [
  [20, [120, 170, 255]],
  [45, [110, 205, 230]],
  [62, [150, 220, 150]],
  [75, [247, 200, 115]],
  [88, [243, 150, 90]],
  [100, [232, 95, 80]],
];

/** Cool-to-warm color for a temperature in °F. */
export function tempColor(t: number): string {
  let prev: [number, Rgb] | null = null;
  for (const [t1, c1] of STOPS) {
    if (t <= t1) {
      if (!prev) return `rgb(${c1})`;
      const [t0, c0] = prev;
      const f = (t - t0) / (t1 - t0);
      return `rgb(${c0.map((c, k) => Math.round(c + ((c1[k] ?? c) - c) * f)).join(",")})`;
    }
    prev = [t1, c1];
  }
  return `rgb(${prev ? prev[1] : ""})`;
}

type Span = { lo: number; hi: number };

/**
 * Maps temperatures onto 0–100% of the week's overall range, so every day's
 * bar sits on the same scale.
 */
export function weekScale(days: Span[]): (t: number) => number {
  const weekLo = Math.min(...days.map((d) => d.lo));
  const weekHi = Math.max(...days.map((d) => d.hi));
  const span = Math.max(1, weekHi - weekLo);
  return (t) => ((t - weekLo) / span) * 100;
}

/** Position, width (at least 4%) and gradient of one day's bar. */
export function rangeBar(day: Span, pct: (t: number) => number) {
  return {
    left: `${pct(day.lo)}%`,
    width: `${Math.max(4, pct(day.hi) - pct(day.lo))}%`,
    background: `linear-gradient(90deg, ${tempColor(day.lo)}, ${tempColor(day.hi)})`,
  };
}

/** Where the "now" dot sits on today's bar, clamped to the track. */
export const nowMarker = (temp: number, pct: (t: number) => number) =>
  `${Math.min(100, Math.max(0, pct(temp)))}%`;
