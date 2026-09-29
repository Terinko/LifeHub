import { describe, expect, it } from "vitest";
import { statLine, type BoxScoreTeam } from "./boxScore";

const teams: BoxScoreTeam[] = [
  {
    statistics: [
      {
        name: "rushing",
        labels: ["CAR", "YDS", "AVG", "TD"],
        athletes: [
          {
            athlete: { displayName: "James Cook" },
            stats: ["12", "61", "5.1", "1"],
          },
        ],
      },
      {
        name: "receiving",
        labels: ["REC", "YDS", "TD"],
        athletes: [
          { athlete: { displayName: "James Cook" }, stats: ["2", "14", "0"] },
        ],
      },
    ],
  },
];

describe("statLine", () => {
  it("joins a player's groups and skips zeros and derived stats", () => {
    expect(statLine(teams, "James Cook")).toBe(
      "12 CAR, 61 YDS, 1 TD · 2 REC, 14 YDS",
    );
  });

  it("is null for a player with no stats", () => {
    expect(statLine(teams, "Josh Allen")).toBeNull();
  });
});
