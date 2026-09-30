import { isSnow, isWet } from "./codes";

/** Inches per 15 minutes that counts as "raining". */
export const WET_THRESHOLD = 0.005;

/**
 * Plain-language summary of the next two hours of 15-minute precipitation.
 * The current weather code counts too, so the card never says "no rain"
 * right under a hero that says "Light drizzle".
 */
export function describeNowcast(
  values: number[],
  precipNow: number | null,
  currentCode: number,
): string | null {
  if (!values.length) return null;
  const wetNow =
    (precipNow ?? 0) > WET_THRESHOLD ||
    (values[0] ?? 0) > WET_THRESHOLD ||
    (isWet(currentCode) && !isSnow(currentCode));
  const firstChange = values.findIndex((v) => v > WET_THRESHOLD !== wetNow);
  const mins = firstChange * 15;
  if (wetNow) {
    if (firstChange === -1) return "Rain continuing for the next 2 hours";
    return mins === 0
      ? "Rain ending shortly"
      : `Rain ending in about ${mins} min`;
  }
  if (firstChange === -1) return "No rain expected for the next 2 hours";
  return mins === 0
    ? "Rain starting shortly"
    : `Rain starting in about ${mins} min`;
}

/** Whether the nowcast has any rain worth drawing bars for. */
export const hasNowcastRain = (values: number[]) =>
  values.some((v) => v > WET_THRESHOLD);

/** Bar height in px for one 15-minute slot (3px floor, 33px at 0.08 in). */
export const nowcastBarHeight = (v: number) => 3 + Math.min(1, v / 0.08) * 30;
