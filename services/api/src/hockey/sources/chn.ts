import type {
  HockeyConference,
  HockeyNpiRow,
  HockeyStandingsRow,
} from "@lifehub/shared";
import { rowsOf, tablesIn, tableWith, textOf, toNumber } from "./html";

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
  return rowsOf(table)
    .filter((cells) => cells.length >= 4 && /^\d+$/.test(cells[0]!))
    .map(([rank, team, npi, record]) => ({
      rank: Number(rank),
      team: team!,
      npi: toNumber(npi!),
      // "1-0-0 (0-0)": the bracket is OT wins/losses; keep the plain record.
      record: record!.replace(/\s*\(.*\)$/, ""),
    }));
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
    .filter((cells) => cells.length >= 7 && /^\d+$/.test(cells[2]!))
    .map((cells, i) => {
      const [r, team, gp, record, , points, goals] = cells;
      rank = /^\d+$/.test(r!) ? Number(r) : rank || i + 1;
      return {
        rank,
        team: team!,
        gamesPlayed: Number(gp),
        record: record!,
        points: toNumber(points!),
        goals: goals!,
      };
    });
}

/** The school names on a conference standings page. */
export const teamNamesIn = (html: string) =>
  parseStandings(html).map((row) => row.team);
