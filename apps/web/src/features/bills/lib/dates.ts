/** A calendar month; `m` is 0 for January. */
export type Month = { y: number; m: number };

const pad = (n: number) => String(n).padStart(2, "0");

export const monthKey = ({ y, m }: Month) => `${y}-${pad(m + 1)}`;

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const monthOf = (d: Date): Month => ({
  y: d.getFullYear(),
  m: d.getMonth(),
});

export function parseMonth(key: string): Month | null {
  const match = /^(\d{4})-(\d{2})/.exec(key);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1 };
}

export function parseDay(key: string | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key ?? "");
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Months since year 0, for comparing and counting months. */
export const monthIndex = ({ y, m }: Month) => y * 12 + m;

export const addMonths = ({ y, m }: Month, n: number): Month => {
  const i = y * 12 + m + n;
  return { y: Math.floor(i / 12), m: ((i % 12) + 12) % 12 };
};

export const daysInMonth = ({ y, m }: Month) => new Date(y, m + 1, 0).getDate();

/** The due day in a given month, moved to the last day when it's short. */
export const clampedDay = (month: Month, day: number) =>
  new Date(month.y, month.m, Math.min(day, daysInMonth(month)));

export const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Whole days from `a` to `b`, ignoring clock changes. */
export function daysBetween(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / 86_400_000);
}

export const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const monthName = (m: number) => MONTHS[m] ?? "";
export const monthShort = (m: number) => monthName(m).slice(0, 3);
export const monthTitle = (month: Month) => `${monthName(month.m)} ${month.y}`;

/** "Sep 5" */
export const shortDate = (d: Date) =>
  `${monthShort(d.getMonth())} ${d.getDate()}`;

/** "Wed, Sep 30" */
export const weekdayDate = (d: Date) =>
  d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

/** "1st", "2nd", "31st" */
export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}
