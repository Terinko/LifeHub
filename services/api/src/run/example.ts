import type { RunActivity, RunData, RunVo2Reading } from "@lifehub/shared";

// Made-up runs shown until Garmin is connected, so the page has something
// real-looking to draw. Generated from a fixed seed relative to today, so it
// looks the same on every load and always ends with this week.

const MILE = 1609.344;
const DAY_MS = 86_400_000;

/** A small seeded random number generator (mulberry32). */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Plan = { name: string; miles: number; pace: number; hr: number };

/**
 * What a day of the week usually holds; `fitness` runs 0 → 1 over the log,
 * and `load` eases off on lighter weeks.
 */
function planFor(
  dow: number,
  fitness: number,
  load: number,
  rand: () => number,
): Plan | null {
  const easy = 615 - 70 * fitness * fitness + rand() * 8;
  const scale = (0.5 + 0.42 * fitness) * load;
  const plans: (Plan | null)[] = [
    { name: "Recovery jog", miles: 4 * scale, pace: easy + 25, hr: 138 },
    { name: "Easy", miles: 5 * scale, pace: easy, hr: 143 },
    rand() < 0.4
      ? null
      : { name: "Easy", miles: 4.5 * scale, pace: easy, hr: 142 },
    { name: "Tempo 3 × 1.5 mi", miles: 6.5 * scale, pace: easy - 75, hr: 163 },
    rand() < 0.5
      ? null
      : { name: "Easy", miles: 3.5 * scale, pace: easy + 5, hr: 141 },
    { name: "Easy + strides", miles: 4 * scale, pace: easy - 5, hr: 144 },
    {
      name: "Long run, river loop",
      miles: 10 * scale,
      pace: easy - 15,
      hr: 149,
    },
  ];
  return plans[dow] ?? null;
}

// The last two weeks have no rest days, so the example shows a live streak.
const STREAK_FILLER: Plan = { name: "Easy", miles: 3.5, pace: 560, hr: 142 };

const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function run(
  date: string,
  plan: Plan,
  rand: () => number,
  i: number,
): RunActivity {
  const miles = Math.round(plan.miles * (0.9 + rand() * 0.2) * 10) / 10;
  return {
    id: `example-${i}`,
    start: `${date}T07:${String(Math.floor(rand() * 50) + 5).padStart(2, "0")}:00`,
    name: plan.name,
    distanceM: Math.round(miles * MILE),
    durationS: Math.round(miles * plan.pace),
    avgHr: Math.round(plan.hr + rand() * 4 - 2),
    elevGainM: Math.round(miles * (8 + rand() * 6)),
  };
}

/** Every made-up run from Jan 1 last year through `today` ("YYYY-MM-DD"). */
export function exampleRuns(today: string): RunActivity[] {
  const rand = seeded(48);
  const first = Date.UTC(+today.slice(0, 4) - 1, 0, 1, 12);
  const last = Date.parse(`${today}T12:00:00Z`);
  const runs: RunActivity[] = [];
  for (let ms = first; ms <= last; ms += DAY_MS) {
    const date = isoDate(ms);
    const dow = (new Date(ms).getUTCDay() + 6) % 7;
    const recent = last - ms < 14 * DAY_MS;
    // Every fifth week is a lighter one, as in a real training block.
    const load = Math.floor((last - ms) / (7 * DAY_MS)) % 5 === 3 ? 0.65 : 1;
    const plan = planFor(dow, (ms - first) / (last - first), load, rand);
    if (!plan && !recent) continue;
    runs.push(run(date, plan ?? STREAK_FILLER, rand, runs.length));
  }
  return runs;
}

function exampleVo2(today: string): RunVo2Reading[] {
  const last = Date.parse(`${today}T12:00:00Z`);
  return Array.from({ length: 30 }, (_, i) => ({
    date: isoDate(last - (29 - i) * 7 * DAY_MS),
    value: 47 + Math.floor((i * 4) / 29),
  }));
}

export function exampleRunData(now: Date): Omit<RunData, "garmin"> {
  // Tyler's calendar day; the example only needs to end on "today".
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
  }).format(now);
  return {
    source: "example",
    syncedAt: now.toISOString(),
    activities: exampleRuns(today),
    vo2Max: exampleVo2(today),
  };
}
