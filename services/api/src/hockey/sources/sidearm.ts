import type { HockeyGoal, HockeyGoalie } from "@lifehub/shared";
import { rowsOf, tablesIn, textOf, toNumber } from "./html";

// Quinnipiac's athletics site (a Sidearm Sports site) publishes full box
// scores. ESPN's college hockey summaries are empty, so this is the one
// source of goals and goalies, which is why box scores are Bobcats-only.
const SITE = "https://gobobcats.com";
export const QUINNIPIAC_ESPN_ID = "2514";
export const SCHEDULE_URL = `${SITE}/sports/mens-ice-hockey/schedule/text`;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "October 2, 2026" → "2026-10-02" */
function isoDate(text: string) {
  const m = text.match(/^(\w+) (\d{1,2}), (\d{4})$/);
  const month = m ? MONTHS.indexOf(m[1]!) + 1 : 0;
  if (!m || month === 0) return undefined;
  return `${m[3]}-${String(month).padStart(2, "0")}-${m[2]!.padStart(2, "0")}`;
}

/**
 * Box score links by game date (YYYY-MM-DD, Eastern). They sit in the
 * page's embedded JSON next to a label naming the opponent and date.
 */
export function boxScoreLinks(html: string): Map<string, string> {
  const links = new Map<string, string>();
  const pattern =
    /"((?:\\u002F|\/)sports(?:\\u002F|\/)mens-ice-hockey(?:\\u002F|\/)stats(?:\\u002F|\/)[^"]*?boxscore(?:\\u002F|\/)\d+)","Box score of [^"]*? on (\w+ \d{1,2}, \d{4})/g;
  for (const m of html.matchAll(pattern)) {
    const date = isoDate(m[2]!);
    if (date) links.set(date, SITE + m[1]!.replace(/\\u002F/g, "/"));
  }
  return links;
}

/** "Wyttenbach, Ethan" or "Simpson,Michael" → "Ethan Wyttenbach" */
const displayName = (name: string) => {
  const [last, first] = name.split(/,\s*/);
  return first ? `${first} ${last}` : name;
};

const GOAL_TYPES: [RegExp, string][] = [
  [/power\s*play|\bPPG?\b/i, "PP"],
  [/short\s*handed|\bSHG?\b/i, "SH"],
  [/empty\s*net|\bENG?\b/i, "EN"],
  [/game\s*winn|\bGWG?\b/i, "GW"],
];

/** "Power Play" → ["PP"]; "None" → [] */
const goalTags = (type: string) =>
  GOAL_TYPES.filter(([pattern]) => pattern.test(type)).map(([, tag]) => tag);

function parseGoals(table: string): HockeyGoal[] {
  return rowsOf(table)
    .filter((cells) => cells.length >= 6 && /\d:\d\d/.test(cells[2]!))
    .map(([team, period, time, type, scorer, assists]) => ({
      team: team!,
      period: period!,
      time: time!.replace(/^0(\d:)/, "$1"),
      scorer: displayName(scorer!),
      assists: assists
        ? assists.split(";").map((a) => displayName(a.trim())).filter(Boolean)
        : [],
      tags: goalTags(type ?? ""),
    }));
}

/** The team abbreviation in the "UNH - Goalkeeping" label above a table. */
function goalieTeam(html: string, table: string) {
  const at = html.indexOf(table);
  const before = textOf(html.slice(Math.max(0, at - 400), at));
  return before.match(/(\S+)\s*-\s*Goalkeeping\s*$/i)?.[1] ?? "";
}

function parseGoalies(html: string): HockeyGoalie[] {
  return tablesIn(html)
    .filter((t) => /\bDec\b/.test(textOf(t)) && textOf(t).includes("Minutes"))
    .flatMap((t) => {
      const team = goalieTeam(html, t);
      return rowsOf(t)
        .filter((c) => c.length >= 10 && /\d+:\d\d/.test(c[3]!))
        .map((c) => ({
          team,
          name: displayName(c[1]!),
          decision: c[2]!,
          minutes: c[3]!,
          goalsAgainst: toNumber(c[4]!),
          saves: toNumber(c[c.length - 1]!),
        }));
    });
}

/**
 * Each team's shots on goal: what the other side's goalies faced (saves
 * plus goals against).
 */
function shotsFrom(goalies: HockeyGoalie[]) {
  const faced = new Map<string, number>();
  for (const g of goalies) {
    faced.set(g.team, (faced.get(g.team) ?? 0) + g.saves + g.goalsAgainst);
  }
  const teams = [...faced.keys()];
  if (teams.length !== 2) return [];
  return teams.map((team, i) => ({
    team: teams[1 - i]!,
    total: faced.get(team)!,
  }));
}

export function parseBoxScore(html: string) {
  const scoring = tablesIn(html).find((t) => textOf(t).includes("Scored By"));
  if (!scoring) throw new Error("Scoring summary not found");
  const attendance = html.match(/Attendance:\s*(?:<[^>]*>\s*)*([\d,]+)/);
  const goalies = parseGoalies(html);
  return {
    goals: parseGoals(scoring),
    goalies,
    shots: shotsFrom(goalies),
    attendance: attendance ? toNumber(attendance[1]!) : undefined,
  };
}
