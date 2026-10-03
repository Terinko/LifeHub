import { describe, expect, it } from "vitest";
import type {
  HockeyNpiRow,
  HockeyStandings,
  HockeyTeamOption,
} from "@lifehub/shared";
import { projectField } from "./projection";

const CONFS = ["aha", "b1g", "ccha", "ecac", "he", "nchc"] as const;

// 24 teams, four per conference, NPI order = list order.
const teams: HockeyTeamOption[] = Array.from({ length: 24 }, (_, i) => ({
  id: String(i + 1),
  name: `Team ${i + 1}`,
  conference: CONFS[i % 6] ?? "ecac",
}));
const npi: HockeyNpiRow[] = teams.map((t, i) => ({
  rank: i + 1,
  team: t.name,
  npi: 60 - i,
  record: "1-0-0",
}));

const standings = (leaders: Partial<Record<string, string>>) =>
  CONFS.map((conference): HockeyStandings => ({
    conference,
    rows: teams
      .filter((t) => t.conference === conference)
      .map((t) => ({
        rank: t.name === leaders[conference] ? 1 : 2,
        team: t.name,
        gamesPlayed: 2,
        record: "1-1-0",
        points: t.name === leaders[conference] ? 6 : 3,
        goals: "4-4",
      }))
      .sort((a, b) => a.rank - b.rank),
  }));

describe("projectField", () => {
  it("takes the top 16 when every conference leader already makes it", () => {
    const p = projectField(npi, teams, standings({}));
    expect(p.field).toHaveLength(16);
    expect(p.field.at(-1)?.team).toBe("Team 16");
    expect(p.firstOut.map((r) => r.team)).toEqual([
      "Team 17",
      "Team 18",
      "Team 19",
      "Team 20",
    ]);
    expect(p.regionals[0]?.games[0]?.map((t) => t.seed)).toEqual([1, 16]);
    expect(p.regionals[3]?.games[1]?.map((t) => t.seed)).toEqual([5, 12]);
  });

  it("puts a low-ranked conference leader in and bumps the last at-large", () => {
    // Team 24 sits last in the NPI but leads the NCHC.
    const p = projectField(npi, teams, standings({ nchc: "Team 24" }));
    expect(p.field.map((f) => f.team)).toContain("Team 24");
    expect(p.field.find((f) => f.team === "Team 24")).toMatchObject({
      seed: 16,
      autobid: "nchc",
    });
    expect(p.field.map((f) => f.team)).not.toContain("Team 16");
    expect(p.firstOut[0]?.team).toBe("Team 16");
  });
});
