// Stat lines from ESPN's public game summary for the players you care about.

export type BoxScoreTeam = {
  statistics?: {
    name: string;
    labels: string[];
    athletes?: { athlete?: { displayName?: string }; stats: string[] }[];
  }[];
};

// The raw counting stats worth showing per group, not derived ones like AVG.
const COLUMNS: Record<string, string[]> = {
  passing: ["C/ATT", "YDS", "TD", "INT"],
  rushing: ["CAR", "YDS", "TD"],
  receiving: ["REC", "YDS", "TD"],
  kicking: ["FG", "XP"],
};

const normalize = (name: string | undefined) =>
  (name ?? "").toLowerCase().replace(/[.'-]/g, "").trim();

/** "6 REC, 49 YDS, 1 TD", groups joined with " · "; null when not found. */
export function statLine(teams: BoxScoreTeam[], playerName: string) {
  const target = normalize(playerName);
  const segments: string[] = [];
  for (const team of teams) {
    for (const group of team.statistics ?? []) {
      const wanted = COLUMNS[group.name];
      const row = group.athletes?.find(
        (a) => normalize(a.athlete?.displayName) === target,
      );
      if (!wanted || !row) continue;
      const parts = wanted.flatMap((label) => {
        const value = row.stats[group.labels.indexOf(label)];
        return value && value !== "0" ? [`${value} ${label}`] : [];
      });
      if (parts.length) segments.push(parts.join(", "));
    }
  }
  return segments.length ? segments.join(" · ") : null;
}
