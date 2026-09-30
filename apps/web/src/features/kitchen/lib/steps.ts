import { normalizeUnit } from "@lifehub/shared";

/**
 * The next amount when + or − is tapped. Counts move by 1; measured amounts
 * move by a quarter under 1 (¼ cup, ½ lb) and by 1 above it. Never below 0.
 */
export function step(value: number, delta: 1 | -1, unit: string): number {
  const counted = normalizeUnit(unit) === "item";
  const fine = !counted && (value < 1 || (value === 1 && delta < 0));
  const size = fine ? 0.25 : 1;
  // Snap to the next whole step, so 1½ lb goes to 2 or 1, not 2½ or ½.
  const steps = value / size;
  const next =
    (delta > 0 ? Math.floor(steps + 1e-9) + 1 : Math.ceil(steps - 1e-9) - 1) *
    size;
  return Math.max(0, Math.round(next * 100) / 100);
}
