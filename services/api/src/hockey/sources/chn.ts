import type {
  HockeyConference,
  HockeyNpiRow,
  HockeyStandingsRow,
} from "@lifehub/shared";
import { cell, rowsOf, tablesIn, tableWith, textOf, toNumber } from "./html";

// College Hockey News: the NPI (the NCAA's selection ranking) updated after
// every game, and each conference's standings.
const CHN = "https://www.collegehockeynews.com";
export const NPI_URL = `${CHN}/ratings/npi`;

const CONFERENCE_PATHS: Record<HockeyConference, string> = {
  aha: "Atlantic-Hockey/1",
  b1g: "Big-Ten/10",
  ccha: "CCHA/2",
  ecac: "ECAC/4",
  he: "Hockey-East/5",
  nchc: "NCHC/9",
};

export const standingsUrl = (conference: HockeyConference) =>
  `${CHN}/reports/conf/${CONFERENCE_PATHS[conference]}`;

export function parseNpi(html: string): HockeyNpiRow[] {
  const table = tableWith(html, "NPI");
  if (!table) throw new Error("NPI table not found");
  const [head = [], ...body] = rowsOf(table);
  // Find columns by their headings, so an added or moved column can't
  // shift the numbers into the wrong place.
  const col = (name: RegExp, fallback: number) => {
    const i = head.findIndex((h) => name.test(h));
    return i === -1 ? fallback : i;
  };
  const at = {
    rank: col(/^rk$/i, 0),
    team: col(/^team$/i, 1),
    npi: col(/^npi$/i, 2),
    record: col(/^record/i, 3),
  };
  const rows: HockeyNpiRow[] = [];
  for (const cells of body) {
    // CHN marks adjusted values with "*" or "#" ("# 42.86"); keep the number.
    const npi = toNumber(cell(cells, at.npi).replace(/^[^\d.-]+/, ""));
    const team = cell(cells, at.team);
    if (!team || !Number.isFinite(npi)) continue;
    rows.push({
      // A blank rank is a tie with the row above.
      rank: Number(cell(cells, at.rank)) || (rows.at(-1)?.rank ?? 1),
      team,
      npi,
      // "1-0-0 (0-0)": the bracket is OT wins/losses; keep the plain record.
      record: cell(cells, at.record).replace(/\s*\(.*\)$/, ""),
    });
  }
  return rows;
}

/**
 * CHN leaves the rank cell blank for teams tied with the row above, so
 * blanks carry the previous rank forward.
 */
export function parseStandings(html: string): HockeyStandingsRow[] {
  const table = tablesIn(html).find((t) => textOf(t).includes("GF-GA"));
  if (!table) throw new Error("Standings table not found");
  let rank = 0;
  return rowsOf(table)
    .filter((cells) => cells.length >= 7 && /^\d+$/.test(cell(cells, 2)))
    .map((cells, i) => {
      const [
        r = "",
        team = "",
        gp = "",
        record = "",
        ,
        points = "",
        goals = "",
      ] = cells;
      rank = /^\d+$/.test(r) ? Number(r) : rank || i + 1;
      return {
        rank,
        team: team,
        gamesPlayed: Number(gp),
        record: record,
        points: toNumber(points),
        goals: goals,
      };
    });
}

/** The school names on a conference standings page. */
export const teamNamesIn = (html: string) =>
  parseStandings(html).map((row) => row.team);
