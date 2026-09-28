import type { StakePlayer, Starter } from "@lifehub/shared";

/** Players by NFL team, merged across leagues. */
export type StakeMap = Map<string, StakePlayer[]>;

/**
 * Adds a starter under their NFL team. A player you have in several leagues
 * becomes one entry listing each league with that league's points.
 */
export function addStake(map: StakeMap, starter: Starter, league: string) {
  if (!starter.team || starter.team === "FA") return;
  const list = map.get(starter.team) ?? [];
  const existing = list.find((p) => p.name === starter.name);
  const entry = { league, points: starter.points };
  if (existing) {
    if (!existing.leagues.some((l) => l.league === league)) {
      existing.leagues.push(entry);
    }
  } else {
    list.push({
      name: starter.name,
      pos: starter.pos,
      team: starter.team,
      leagues: [entry],
    });
  }
  map.set(starter.team, list);
}

export const stakesFor = (map: StakeMap, teams: string[]) =>
  teams.flatMap((t) => map.get(t) ?? []);
