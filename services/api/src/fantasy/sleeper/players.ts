import type { Position } from "@lifehub/shared";
import * as repo from "../repository";
import { toPosition } from "../positions";
import { getAllPlayers, type SleeperPlayer } from "./api";

export type CachedPlayer = { name: string; team: string; pos: Position };
export type PlayerMap = Record<string, CachedPlayer>;

// Sleeper's full player list is ~5 MB and changes day to day, so a trimmed
// copy is cached in DynamoDB and refreshed at most every 20 hours.
const TTL_MS = 20 * 60 * 60 * 1000;
const FANTASY_POSITIONS = new Set(["QB", "RB", "WR", "TE", "K", "DEF"]);

const isFresh = (fetchedAt: string | undefined, now: number) =>
  !!fetchedAt && now - new Date(fetchedAt).getTime() < TTL_MS;

/** Keeps only rostered fantasy positions and the three fields the guide uses. */
export function trimPlayers(
  all: Record<string, SleeperPlayer | null>,
): PlayerMap {
  const trimmed: PlayerMap = {};
  for (const [id, p] of Object.entries(all)) {
    if (!p?.team || !p.position || !FANTASY_POSITIONS.has(p.position)) continue;
    trimmed[id] = {
      name: p.full_name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
      team: p.team,
      pos: toPosition(p.position),
    };
  }
  return trimmed;
}

export async function getSleeperPlayers(now = Date.now()): Promise<PlayerMap> {
  const cached = await repo.getPlayerCache<PlayerMap>();
  if (cached && isFresh(cached.fetchedAt, now)) return cached.players;

  const players = trimPlayers(await getAllPlayers());
  await repo.putPlayerCache({
    fetchedAt: new Date(now).toISOString(),
    players,
  });
  return players;
}

/** Team defenses are keyed by team code ("KC") instead of a numeric id. */
export function resolvePlayer(
  playerId: string,
  players: PlayerMap,
): CachedPlayer | null {
  const player = players[playerId];
  if (player) return player;
  if (/^[A-Z]{2,4}$/.test(playerId)) {
    return { name: `${playerId} Defense`, team: playerId, pos: "DEF" };
  }
  return null;
}
