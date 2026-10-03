import { describe, expect, it } from "vitest";
import { parseStats } from "./sidearmStats";

// A cut-down copy of the stats page's devalue payload: every object value
// is an index into the array, as Nuxt writes it.
const payload = [
  ["Reactive", 1],
  { individualStats: 2 },
  [3, 14, 23],
  {
    isAFooterStat: 4,
    playerName: 5,
    playerUniform: 6,
    gamesPlayed: 7,
    shotStats: 8,
    goalStats: 11,
    miscStats: 12,
    goalieStats: 13,
  },
  false,
  "Wyttenbach, Ethan",
  "19",
  "1",
  { goals: 9, assists: 7, points: 10 },
  "2",
  "3",
  { powerPlayGoals: 7 },
  { plusMinus: 9 },
  null,
  {
    isAFooterStat: 4,
    playerName: 15,
    playerUniform: 16,
    gamesPlayed: 7,
    goalieStats: 17,
  },
  "Kirsch, Christian",
  "65",
  {
    gamesPlayed: 7,
    win: 7,
    loss: 18,
    tie: 18,
    seconds: 19,
    goalsAgainstAverage: 20,
    savePercentage: 21,
    saves: 22,
    shutouts: 18,
  },
  "0",
  3600,
  "2.00",
  ".913",
  "21",
  { isAFooterStat: 24, playerName: 25, gamesPlayed: 7 },
  true,
  "Total",
];

const page = `<html><script type="application/json" id="__NUXT_DATA__">${JSON.stringify(payload)}</script></html>`;

describe("Sidearm stats", () => {
  it("reads skaters and goalies from the embedded data", () => {
    expect(parseStats(page)).toEqual({
      skaters: [
        {
          name: "Ethan Wyttenbach",
          number: "19",
          gamesPlayed: 1,
          goals: 2,
          assists: 1,
          points: 3,
          powerPlayGoals: 1,
          plusMinus: 2,
        },
      ],
      goalies: [
        {
          name: "Christian Kirsch",
          number: "65",
          gamesPlayed: 1,
          record: "1-0-0",
          goalsAgainstAverage: 2,
          savePercentage: 0.913,
          saves: 21,
          shutouts: 0,
        },
      ],
    });
  });

  it("fails loudly when the page has no stats data", () => {
    expect(() => parseStats("<html></html>")).toThrow("Stats data not found");
  });
});
