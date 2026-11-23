import type { Muscle } from "@lifehub/shared";

// Garmin names exercises two ways: the activity JSON uses "BENCH_PRESS" and
// "EZ_BAR_PREACHER_CURL", FIT files use "benchPress" and "ezBarPreacherCurl".
// Both are squashed to lowercase letters so one table reads either.

/** "BENCH_PRESS" or "benchPress" → "benchpress". */
export const squash = (name: string) =>
  name.toLowerCase().replace(/[^a-z]/g, "");

const MUSCLE: Record<string, Muscle> = {
  benchpress: "chest",
  flye: "chest",
  pushup: "chest",
  row: "back",
  pullup: "back",
  shrug: "back",
  hyperextension: "back",
  curl: "biceps",
  tricepsextension: "triceps",
  shoulderpress: "shoulders",
  lateralraise: "shoulders",
  shoulderstability: "shoulders",
  squat: "legs",
  lunge: "legs",
  legcurl: "legs",
  calfraise: "legs",
  deadlift: "legs",
  hipraise: "legs",
  hipstability: "legs",
  hipswing: "legs",
  plyo: "legs",
  core: "core",
  crunch: "core",
  plank: "core",
  situp: "core",
  legraise: "core",
  chop: "core",
};

export const muscleFor = (category: string): Muscle =>
  MUSCLE[squash(category)] ?? "other";

/** "TRICEPS_EXTENSION" → "Triceps extension". */
const sentence = (category: string) => {
  const words = category
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase()
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * The name LifeHub shows for a set: the tracked lifts get fixed names so
 * their sessions line up, everything else is its Garmin category.
 */
export function exerciseName(
  category: string,
  name: string | undefined,
  weightKg: number | undefined,
): string {
  const cat = squash(category);
  const exact = squash(name ?? "");
  if (cat === "benchpress")
    return exact.includes("incline") ? "Incline bench press" : "Bench press";
  if (cat === "row") return "Row";
  if (cat === "curl") {
    if (exact.includes("hammer")) return "Hammer curl";
    if (exact.includes("preacher")) return "Preacher curl";
    return "Curl";
  }
  if (cat === "pullup") {
    if (exact.includes("pulldown")) return "Lat pulldown";
    if (exact.includes("chin")) return "Chin-up";
    return weightKg ? "Weighted pull-up" : "Pull-up";
  }
  return cat === "unknown" || !cat ? "Other" : sentence(category);
}
