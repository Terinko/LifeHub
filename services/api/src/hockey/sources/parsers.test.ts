import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseNpi, parseStandings } from "./chn";
import { toGames, type EspnEvent } from "./espn";
import { parsePoll } from "./poll";
import { boxScoreLinks, parseBoxScore } from "./sidearm";

const fixture = (name: string) =>
  readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8");

describe("ESPN scoreboard", () => {
  const { events } = JSON.parse(fixture("espn-scoreboard.json")) as {
    events: EspnEvent[];
  };
  const games = toGames(events);
  const byId = (id: string) => {
    const game = games.find((g) => g.id === id);
    if (!game) throw new Error(`No game ${id}`);
    return game;
  };

  it("reads a final with ranks, periods and TV", () => {
    expect(byId("401904792")).toMatchObject({
      state: "post",
      detail: "Final",
      venue: "M&T Bank Arena",
      tv: ["ESPN+"],
      home: { name: "Quinnipiac", rank: 7, score: 10, periods: [4, 3, 3] },
      away: { name: "New Hampshire", rank: undefined, score: 2 },
    });
  });

  it("reads a live game's clock", () => {
    expect(byId("401905039")).toMatchObject({
      state: "in",
      detail: "0:29 - 3rd",
    });
  });

  it("leaves scores blank before puck drop", () => {
    const game = byId("401904860");
    expect(game.state).toBe("pre");
    expect(game.away).toMatchObject({ name: "Denver", rank: 1 });
    expect(game.away.score).toBeUndefined();
  });
});

describe("ESPN team schedule", () => {
  it("works out the winner when ESPN leaves it out", () => {
    const { events } = JSON.parse(fixture("espn-team-schedule.json")) as {
      events: EspnEvent[];
    };
    const [first, second] = toGames(events);
    expect(first).toMatchObject({
      state: "post",
      home: { name: "Quinnipiac", score: 10, winner: true },
      away: { name: "New Hampshire", score: 2, winner: false },
    });
    expect(second).toMatchObject({
      state: "pre",
      away: { name: "Merrimack", rank: 20 },
    });
  });
});

describe("USCHO poll", () => {
  const poll = parsePoll(fixture("ncaa-poll.html"));

  it("reads all twenty rows with first-place votes", () => {
    expect(poll.rows).toHaveLength(20);
    expect(poll.rows[0]).toEqual({
      rank: 1,
      team: "Denver",
      firstPlaceVotes: 35,
      record: "0-0-0",
      points: 973,
      previous: 1,
    });
    expect(poll.rows[6]).toMatchObject({
      team: "Quinnipiac",
      firstPlaceVotes: 0,
      previous: 8,
    });
  });

  it("marks newly ranked teams and reads the date and others", () => {
    expect(poll.rows.find((r) => r.team === "Minnesota")?.previous).toBeNull();
    expect(poll.through).toBe("Through Games SEP. 21, 2026");
    expect(poll.others[0]).toEqual({ team: "Augustana", points: 70 });
    expect(poll.others).toHaveLength(17);
  });
});

describe("CHN", () => {
  it("reads the NPI table", () => {
    const rows = parseNpi(fixture("chn-npi.html"));
    expect(rows[0]).toEqual({
      rank: 1,
      team: "Maine",
      npi: 57.14,
      record: "1-0-0",
    });
    expect(rows.find((r) => r.team === "Quinnipiac")?.rank).toBe(8);
  });

  it("skips NPI rows without a number and finds moved columns", () => {
    const html = `<table>
      <tr><th>Rk</th><th></th><th>Team</th><th>Record (ot)</th><th>NPI</th></tr>
      <tr><td>1</td><td>*</td><td>Maine</td><td>2-0-0 (0-0)</td><td>60.10</td></tr>
      <tr><td></td><td></td><td>Quinnipiac</td><td>2-0-0 (0-0)</td><td>60.10</td></tr>
      <tr><td>3</td><td></td><td>Alaska</td><td>0-0-0 (0-0)</td><td>--</td></tr>
    </table>`;
    expect(parseNpi(html)).toEqual([
      { rank: 1, team: "Maine", npi: 60.1, record: "2-0-0" },
      { rank: 1, team: "Quinnipiac", npi: 60.1, record: "2-0-0" },
    ]);
  });

  it("reads conference standings, carrying tied ranks down", () => {
    const rows = parseStandings(fixture("chn-conf-ecac.html"));
    expect(rows).toHaveLength(12);
    expect(rows[0]).toEqual({
      rank: 1,
      team: "Brown",
      gamesPlayed: 0,
      record: "0-0-0",
      points: 0,
      goals: "0-0",
    });
    expect(rows.every((r) => r.rank === 1)).toBe(true);
  });
});

describe("Quinnipiac box scores", () => {
  it("finds box score links by date", () => {
    const links = boxScoreLinks(fixture("sidearm-schedule.txt"));
    expect(links.get("2026-10-02")).toBe(
      "https://gobobcats.com/sports/mens-ice-hockey/stats/2026-27/new-hampshire/boxscore/23767",
    );
  });

  it("reads goals, goalies, shots and attendance", () => {
    const box = parseBoxScore(fixture("sidearm-box.html"));
    expect(box.goals).toHaveLength(12);
    expect(box.goals[0]).toEqual({
      team: "Quinnipiac",
      period: "1st",
      time: "2:29",
      scorer: "Ethan Wyttenbach",
      assists: ["Jack Stockfish"],
      tags: [],
    });
    expect(box.goals.filter((g) => g.tags.includes("PP"))).toHaveLength(3);
    expect(box.goalies).toContainEqual({
      team: "UNH",
      name: "Michael Simpson",
      decision: "L",
      minutes: "39:59",
      goalsAgainst: 7,
      saves: 16,
    });
    expect(box.attendance).toBe(3625);
    expect(box.shots).toEqual([
      { team: "QUI", total: 35 },
      { team: "UNH", total: 23 },
    ]);
  });
});
