import type {
  FantasyGuide,
  LinkLeagueInput,
  LinkedLeague,
  SleeperLeagueSearch,
  UpdateLeagueInput,
} from "@lifehub/shared";
import { api } from "../../shared/api/client";
import type { BoxScoreTeam } from "./lib/boxScore";

const leaguePath = (sk: string) => `/fantasy/leagues/${encodeURIComponent(sk)}`;

export const getGuide = () => api.get<FantasyGuide>("/fantasy/guide");

export const listLeagues = () => api.get<LinkedLeague[]>("/fantasy/leagues");

export const linkLeague = (input: LinkLeagueInput) =>
  api.post<LinkedLeague>("/fantasy/leagues", input);

export const updateLeague = (sk: string, input: UpdateLeagueInput) =>
  api.put<LinkedLeague>(leaguePath(sk), input);

export const unlinkLeague = (sk: string) =>
  api.delete<{ message: string }>(leaguePath(sk));

export const findSleeperLeagues = (username: string) =>
  api.get<SleeperLeagueSearch>(
    `/fantasy/sleeper-leagues?username=${encodeURIComponent(username)}`,
  );

/**
 * ESPN's public game summary. It's open to browsers (no auth, CORS allowed),
 * so it's the one call that skips the LifeHub API.
 */
export async function getBoxScore(gameId: string): Promise<BoxScoreTeam[]> {
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`,
  );
  if (!res.ok) throw new Error(`Box score failed (${res.status})`);
  const json = (await res.json()) as {
    boxscore?: { players?: BoxScoreTeam[] };
  };
  return json.boxscore?.players ?? [];
}
