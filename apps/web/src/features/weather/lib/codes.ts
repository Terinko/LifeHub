import type { Scene, SceneKind } from "../types";

// WMO weather codes, as Open-Meteo reports them.

// From the backtest: only call a day "rainy" when NBM forecasts >= 0.10 in.
const RAIN_DAY_THRESHOLD_IN = 0.1;

export const isWet = (c: number) =>
  (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95;

export const isSnow = (c: number) =>
  (c >= 71 && c <= 77) || c === 85 || c === 86;

const LABELS: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Cloudy",
  45: "Fog",
  48: "Freezing fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorms",
  96: "Thunderstorms with hail",
  99: "Thunderstorms with hail",
};

export function codeLabel(code: number | null, isDay = true): string {
  if (!isDay && (code === 0 || code === 1))
    return code === 0 ? "Clear night" : "Mostly clear";
  return (code == null ? undefined : LABELS[code]) ?? "—";
}

function rainIntensity(code: number): number {
  if ([65, 67, 82].includes(code)) return 2;
  if ([51, 56, 61, 80].includes(code)) return 0.55;
  return 1;
}

function snowIntensity(code: number): number {
  if (code === 75 || code === 86) return 2;
  if (code === 71 || code === 85) return 0.6;
  return 1;
}

/** Which background simulation to run for a weather code. */
export function sceneFor(code: number, isDay: boolean): Scene {
  let kind: SceneKind = "clear";
  let intensity = 1;
  if (code === 2) kind = "partly";
  else if (code === 3) kind = "cloudy";
  else if (code === 45 || code === 48) kind = "fog";
  else if (code >= 95) kind = "storm";
  else if (isSnow(code)) {
    kind = "snow";
    intensity = snowIntensity(code);
  } else if (isWet(code)) {
    kind = "rain";
    intensity = rainIntensity(code);
  }
  return { kind, isDay: !!isDay, intensity };
}

/** "clear-day", "rain-night"…: the key for sky gradients and card tints. */
export const sceneKey = (scene: Scene) =>
  `${scene.kind}-${scene.isDay ? "day" : "night"}`;

/**
 * The backtest's rain rule, applied to the daily summary: a wet code with
 * under 0.10 in forecast gets downgraded, and a dry code with 0.10 in or
 * more gets upgraded. Snow codes are left alone.
 */
export function adjustDailyCode(
  code: number | null,
  sumIn: number | null,
): number | null {
  if (code == null) return code;
  if (isSnow(code)) return code;
  const sum = sumIn ?? 0;
  if (isWet(code) && sum < RAIN_DAY_THRESHOLD_IN) {
    // Showers and storms are usually hit-or-miss with sun around.
    return code >= 80 ? 2 : 3;
  }
  if (!isWet(code) && sum >= RAIN_DAY_THRESHOLD_IN) {
    return sum >= 0.5 ? 63 : 61;
  }
  return code;
}
