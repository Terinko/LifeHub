import {
  HOCKEY_CONFERENCES,
  sameHockeyTeam,
  type HockeyConference,
  type HockeyNpiRow,
  type HockeyStandings,
  type HockeyTeamOption,
} from "@lifehub/shared";

/** Six conference champions plus ten at-large teams. */
export const FIELD_SIZE = 16;

export type FieldTeam = {
  seed: number;
  team: string;
  npiRank: number;
  /** Set when the team is in as its conference's automatic bid. */
  autobid?: HockeyConference;
};

export type Regional = { name: string; games: [FieldTeam, FieldTeam][] };

export type Projection = {
  field: FieldTeam[];
  regionals: Regional[];
  lastIn: FieldTeam[];
  firstOut: HockeyNpiRow[];
};

// Seeds by regional, keeping the bands apart the way the NCAA does
// (1 v 16 and 8 v 9 in the first regional, and so on).
const BRACKET: [number, number][][] = [
  [
    [1, 16],
    [8, 9],
  ],
  [
    [2, 15],
    [7, 10],
  ],
  [
    [3, 14],
    [6, 11],
  ],
  [
    [4, 13],
    [5, 12],
  ],
];

const conferenceOf = (team: string, teams: HockeyTeamOption[]) =>
  teams.find((t) => sameHockeyTeam(t.name, team))?.conference;

/**
 * Each conference's automatic bid if the season ended today: its standings
 * leader (ties go to the better NPI), or before league play its best NPI team.
 */
export function autobids(
  npi: HockeyNpiRow[],
  teams: HockeyTeamOption[],
  standings: HockeyStandings[],
): Map<HockeyConference, string> {
  const npiAt = (team: string) => {
    const i = npi.findIndex((r) => sameHockeyTeam(r.team, team));
    return i === -1 ? Infinity : i;
  };
  const bids = new Map<HockeyConference, string>();
  for (const conference of HOCKEY_CONFERENCES) {
    const table = standings.find((s) => s.conference === conference);
    const played = table?.rows.some((r) => r.gamesPlayed > 0);
    const pool = played
      ? (table?.rows ?? []).filter((r) => r.rank === table?.rows[0]?.rank)
      : npi.filter((r) => conferenceOf(r.team, teams) === conference);
    const best = [...pool]
      .map((r) => r.team)
      .sort((a, b) => npiAt(a) - npiAt(b))[0];
    if (best && npiAt(best) !== Infinity) {
      const row = npi[npiAt(best)];
      if (row) bids.set(conference, row.team);
    }
  }
  return bids;
}

/** The 16-team field and bracket if the season ended today. */
export function projectField(
  npi: HockeyNpiRow[],
  teams: HockeyTeamOption[],
  standings: HockeyStandings[],
): Projection {
  const bids = autobids(npi, teams, standings);
  const autobidOf = (team: string) =>
    [...bids].find(([, t]) => t === team)?.[0];
  const atLarge = FIELD_SIZE - bids.size;

  const inField = new Set(bids.values());
  const atLargeTeams: HockeyNpiRow[] = [];
  for (const row of npi) {
    if (atLargeTeams.length >= atLarge) break;
    if (!inField.has(row.team)) {
      atLargeTeams.push(row);
      inField.add(row.team);
    }
  }

  const field: FieldTeam[] = npi
    .filter((r) => inField.has(r.team))
    .map((r, i) => ({
      seed: i + 1,
      team: r.team,
      npiRank: r.rank,
      autobid: autobidOf(r.team),
    }));

  const bySeed = (seed: number) => field[seed - 1];
  const regionals: Regional[] =
    field.length === FIELD_SIZE
      ? BRACKET.map((games, i) => ({
          name: `Regional ${i + 1}`,
          games: games.flatMap(([a, b]) => {
            const top = bySeed(a);
            const bottom = bySeed(b);
            return top && bottom
              ? [[top, bottom] as [FieldTeam, FieldTeam]]
              : [];
          }),
        }))
      : [];

  const atLargeSet = new Set(atLargeTeams.map((r) => r.team));
  return {
    field,
    regionals,
    lastIn: field.filter((f) => atLargeSet.has(f.team)).slice(-4),
    firstOut: npi.filter((r) => !inField.has(r.team)).slice(0, 4),
  };
}
