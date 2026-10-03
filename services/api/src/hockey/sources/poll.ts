import type { HockeyPoll, HockeyPollRow } from "@lifehub/shared";
import { rowsOf, tableWith, textOf, toNumber } from "./html";

/** NCAA.com republishes the USCHO.com poll as a plain table. */
export const POLL_URL = "https://www.ncaa.com/rankings/icehockey-men/d1";

type ParsedPoll = Omit<HockeyPoll, "history" | "seenAt">;

function parseRow(cells: string[]): HockeyPollRow | undefined {
  const [rank = "", teamCell = "", record = "", points = "0", previous = ""] =
    cells;
  const team = teamCell.match(/^(.*?)(?:\s*\((\d+)\))?$/);
  if (!team || Number.isNaN(toNumber(rank))) return undefined;
  const prev = toNumber(previous);
  return {
    rank: toNumber(rank),
    team: (team[1] ?? "").trim(),
    firstPlaceVotes: team[2] ? Number(team[2]) : 0,
    record,
    points: toNumber(points),
    previous: Number.isNaN(prev) || prev === 0 ? null : prev,
  };
}

/** "Augustana 70, Ohio State 59" → [{ team, points }] */
function parseOthers(html: string) {
  const match = html.match(
    /Others receiving votes:\s*<\/strong>([\s\S]*?)<\/p>/i,
  );
  if (!match) return [];
  return textOf(match[1] ?? "")
    .split(",")
    .map((part) => part.trim().match(/^(.*\D)\s+(\d+)$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ team: (m[1] ?? "").trim(), points: Number(m[2]) }));
}

export function parsePoll(html: string): ParsedPoll {
  const table = tableWith(html, "POINTS");
  if (!table) throw new Error("Poll table not found");
  const rows = rowsOf(table)
    .map(parseRow)
    .filter((r): r is HockeyPollRow => !!r);
  if (rows.length === 0) throw new Error("Poll table was empty");
  const through = textOf(
    html.match(/rankings-last-updated[^>]*>([\s\S]*?)<\/figure>/i)?.[1] ?? "",
  );
  return { through, rows, others: parseOthers(html) };
}
