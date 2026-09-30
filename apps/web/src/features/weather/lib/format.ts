/** Whole degrees/percent/mph, or "--" when the value is missing. */
export const round = (n: number | null | undefined): number | "--" =>
  n == null ? "--" : Math.round(n);

const hour12 = (h: number) => (h % 12 === 0 ? 12 : h % 12);
const meridiem = (h: number) => (h < 12 ? "AM" : "PM");

/** "3PM" from a local ISO time like "2026-09-30T15:00". */
export function hourLabel(iso: string): string {
  const h = Number(iso.slice(11, 13));
  return `${hour12(h)}${meridiem(h)}`;
}

/** "6:52 AM" from a local ISO time, or "--". */
export function clockLabel(iso: string | null | undefined): string {
  if (!iso) return "--";
  const h = Number(iso.slice(11, 13));
  const m = iso.slice(14, 16);
  return `${hour12(h)}:${m} ${meridiem(h)}`;
}

/** "Today" for the first row, then short weekday names. */
export const dayLabel = (date: string, i: number): string =>
  i === 0
    ? "Today"
    : new Date(`${date}T12:00`).toLocaleDateString("en-US", {
        weekday: "short",
      });

const COMPASS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
];

/** 16-point compass direction for a bearing in degrees. */
export const compass = (deg: number | null | undefined): string =>
  deg == null ? "" : (COMPASS[Math.round(deg / 22.5) % 16] ?? "");

export function uvLabel(uv: number | null | undefined): string {
  if (uv == null) return "";
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very high";
  return "Extreme";
}

/** Whole minutes since `updatedAt`, never negative. */
export const minutesAgo = (now: number, updatedAt: number) =>
  Math.max(0, Math.round((now - updatedAt) / 60000));
