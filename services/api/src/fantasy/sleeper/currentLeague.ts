import * as repo from "../repository";
import type { StoredLeague } from "../repository";
import { getLeague, getUserLeagues } from "./api";

/**
 * Sleeper gives a league a new id every season (the new one points back
 * through previous_league_id). Follows that link so a league linked last
 * year keeps working, and saves the league's name and season as it goes.
 */
export async function currentSleeperLeague(
  userId: string,
  league: StoredLeague,
  season: string,
): Promise<StoredLeague> {
  if (league.season === season && league.leagueName) return league;

  const info = await getLeague(league.leagueId);
  let next = {
    leagueId: info.league_id,
    season: info.season,
    leagueName: info.name,
  };
  if (Number(info.season) < Number(season) && league.sleeperUserId) {
    const renewed = (await getUserLeagues(league.sleeperUserId, season)).find(
      (l) => l.previous_league_id === league.leagueId,
    );
    if (renewed) {
      next = {
        leagueId: renewed.league_id,
        season: renewed.season,
        leagueName: renewed.name,
      };
    }
  }

  await repo
    .updateLeague(userId, league.sk, next)
    .catch((error: unknown) =>
      console.error(`Failed to update ${league.sk}:`, error),
    );
  return { ...league, ...next };
}
