import type { ChangelogEntry } from "@lifehub/shared";

const TOOL_LABELS: Record<string, string> = {
  bills: "Bills",
  kitchen: "Kitchen",
  poker: "Poker",
  pokerStats: "Poker Stats",
  fantasy: "Fantasy",
  weather: "Weather",
};

/** The tag above a "What's New" entry: the tools it's about, or "General". */
export function changelogTag(entry: ChangelogEntry): string {
  if (!entry.tools || entry.tools.length === 0) return "General";
  return entry.tools.map((tool) => TOOL_LABELS[tool] || tool).join(", ");
}
