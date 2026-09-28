import type { EspnCookies } from "@lifehub/shared";
import { fetchJson } from "../../shared/fetchJson";

export type EspnPlayer = {
  fullName: string;
  proTeamId: number;
  defaultPositionId: number;
  stats?: {
    scoringPeriodId: number;
    statSourceId: number;
    appliedTotal: number;
  }[];
};

export type EspnRosterEntry = {
  lineupSlotId: number;
  playerPoolEntry?: { player?: EspnPlayer };
  player?: EspnPlayer;
};

export type EspnTeam = {
  id: number;
  name?: string;
  location?: string;
  nickname?: string;
  record?: { overall?: { wins?: number; losses?: number; ties?: number } };
  roster?: { entries?: EspnRosterEntry[] };
};

export type EspnLeague = {
  settings?: {
    name?: string;
    scheduleSettings?: { matchupPeriods?: Record<string, number[]> };
  };
  teams?: EspnTeam[];
  schedule?: {
    matchupPeriodId: number;
    home?: { teamId: number };
    away?: { teamId: number };
  }[];
};

export const teamPageUrl = (leagueId: string, teamId: string, season: string) =>
  `https://fantasy.espn.com/football/team?leagueId=${leagueId}&teamId=${teamId}&seasonId=${season}`;

/** A league's teams, rosters, schedule and settings for one season. */
export function getEspnLeague(
  leagueId: string,
  season: string,
  cookies?: EspnCookies,
) {
  const url =
    `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}` +
    `/segments/0/leagues/${leagueId}?view=mTeam&view=mRoster&view=mMatchup&view=mSettings`;
  return fetchJson<EspnLeague>(
    url,
    cookies
      ? {
          headers: {
            Cookie: `espn_s2=${cookies.espn_s2}; SWID=${cookies.swid}`,
          },
        }
      : {},
  );
}
