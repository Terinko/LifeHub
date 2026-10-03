import type {
  HockeyGoalieStats,
  HockeySkaterStats,
  HockeyTeamStats,
} from "@lifehub/shared";
import { findObjectWith, nuxtData } from "./nuxt";

export const STATS_URL = "https://gobobcats.com/sports/mens-ice-hockey/stats";

type Raw = Record<string, unknown>;

const num = (v: unknown) => {
  const n = Number(typeof v === "string" ? v.replace(/[^\d.-]/g, "") : v);
  return Number.isFinite(n) ? n : 0;
};

const obj = (v: unknown): Raw =>
  v !== null && typeof v === "object" ? (v as Raw) : {};

/** "Wyttenbach, Ethan" → "Ethan Wyttenbach" */
const displayName = (raw: unknown) => {
  const name = String(raw ?? "").trim();
  const [last, first] = name.split(/,\s*/);
  return first ? `${first} ${last}` : name;
};

/** The season's skater and goalie lines from the stats page's embedded data. */
export function parseStats(html: string): Omit<HockeyTeamStats, "source"> {
  const data = nuxtData(html);
  const holder = data && findObjectWith(data, "individualStats");
  const list = holder?.individualStats;
  if (!Array.isArray(list)) throw new Error("Stats data not found");

  const players = list
    .map(obj)
    .filter((p) => !p.isAFooterStat && displayName(p.playerName) !== "Team");

  const skaters: HockeySkaterStats[] = players
    .filter((p) => num(p.gamesPlayed) > 0 && !num(obj(p.goalieStats).seconds))
    .map((p) => {
      const shots = obj(p.shotStats);
      return {
        name: displayName(p.playerName),
        number: p.playerUniform ? String(p.playerUniform) : undefined,
        gamesPlayed: num(p.gamesPlayed),
        goals: num(shots.goals),
        assists: num(shots.assists),
        points: num(shots.points ?? p.points),
        powerPlayGoals: num(obj(p.goalStats).powerPlayGoals),
        plusMinus: num(obj(p.miscStats).plusMinus),
      };
    });

  const goalies: HockeyGoalieStats[] = players
    .filter((p) => num(obj(p.goalieStats).seconds) > 0)
    .map((p) => {
      const g = obj(p.goalieStats);
      return {
        name: displayName(p.playerName),
        number: p.playerUniform ? String(p.playerUniform) : undefined,
        gamesPlayed: num(g.gamesPlayed),
        record: `${num(g.win)}-${num(g.loss)}-${num(g.tie)}`,
        goalsAgainstAverage: num(g.goalsAgainstAverage),
        savePercentage: num(g.savePercentage),
        saves: num(g.saves),
        shutouts: num(g.shutouts),
      };
    });

  return { skaters, goalies };
}
