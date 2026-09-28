import { fetchJson, UpstreamError } from "../../shared/fetchJson";

// Sleeper's public read-only API: https://docs.sleeper.com

const BASE = "https://api.sleeper.app/v1";

export type SleeperState = {
  week: number;
  season: string;
  /** The season new leagues are being created for (ahead in the offseason). */
  league_season?: string;
  /** "pre", "regular" or "post". */
  season_type?: string;
};

export type SleeperUser = {
  user_id: string;
  username?: string;
  display_name?: string;
  metadata?: { team_name?: string };
};

export type SleeperLeague = {
  league_id: string;
  name: string;
  season: string;
  total_rosters?: number;
  previous_league_id?: string | null;
};

export type SleeperRoster = {
  roster_id: number;
  owner_id: string | null;
  settings?: { wins?: number; losses?: number; ties?: number };
};

export type SleeperMatchup = {
  roster_id: number;
  matchup_id: number | null;
  points?: number;
  starters?: string[];
  players_points?: Record<string, number>;
};

export type SleeperPlayer = {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  team?: string | null;
  position?: string | null;
};

export const getState = () => fetchJson<SleeperState>(`${BASE}/state/nfl`);

export const getLeague = (leagueId: string) =>
  fetchJson<SleeperLeague>(`${BASE}/league/${leagueId}`);

export const getLeagueUsers = (leagueId: string) =>
  fetchJson<SleeperUser[]>(`${BASE}/league/${leagueId}/users`);

export const getRosters = (leagueId: string) =>
  fetchJson<SleeperRoster[]>(`${BASE}/league/${leagueId}/rosters`);

export const getMatchups = (leagueId: string, week: number) =>
  fetchJson<SleeperMatchup[] | null>(
    `${BASE}/league/${leagueId}/matchups/${week}`,
  ).then((list) => list ?? []);

export const getUserLeagues = (userId: string, season: string) =>
  fetchJson<SleeperLeague[] | null>(
    `${BASE}/user/${userId}/leagues/nfl/${season}`,
  ).then((list) => list ?? []);

/** Looks a user up by username or user id. Null when there's no such user. */
export async function findUser(usernameOrId: string) {
  try {
    const user = await fetchJson<SleeperUser | null>(
      `${BASE}/user/${encodeURIComponent(usernameOrId)}`,
    );
    return user?.user_id ? user : null;
  } catch (error) {
    if (error instanceof UpstreamError && error.status === 404) return null;
    throw error;
  }
}

/** Every NFL player (~5 MB). Cached by players.ts; don't call this directly. */
export const getAllPlayers = () =>
  fetchJson<Record<string, SleeperPlayer | null>>(
    `${BASE}/players/nfl`,
    {},
    25_000,
  );
