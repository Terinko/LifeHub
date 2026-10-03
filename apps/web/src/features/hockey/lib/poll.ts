import {
  sameHockeyTeam,
  type HockeyPoll,
  type HockeyPollRow,
} from "@lifehub/shared";

export type Movement =
  { kind: "new" } | { kind: "up" | "down"; by: number } | { kind: "same" };

export function movement(row: HockeyPollRow): Movement {
  if (row.previous === null) return { kind: "new" };
  const by = row.previous - row.rank;
  if (by > 0) return { kind: "up", by };
  if (by < 0) return { kind: "down", by: -by };
  return { kind: "same" };
}

export const findRow = (rows: { team: string }[], name: string) =>
  rows.findIndex((r) => sameHockeyTeam(r.team, name));

export type TrendPoint = { label: string; rank: number | null };

/** "Through Games SEP. 21, 2026" → "Sep 21" */
const weekLabel = (through: string) => {
  const m = through.match(/([A-Z])([A-Z]{2})\w*\.?\s+(\d{1,2})/i);
  return m ? `${m[1]}${m[2]?.toLowerCase()} ${m[3]}` : through;
};

/**
 * The team's rank in each saved poll, oldest first, led by its rank in the
 * poll before the first one we saved (the "previous" column). null = NR.
 */
export function rankTrend(poll: HockeyPoll, team: string): TrendPoint[] {
  const points: TrendPoint[] = poll.history.map((snap) => {
    const row = snap.rows.find((r) => sameHockeyTeam(r.team, team));
    return { label: weekLabel(snap.through), rank: row?.rank ?? null };
  });
  const first = poll.history[0]?.rows.find((r) => sameHockeyTeam(r.team, team));
  if (poll.history.length > 0) {
    points.unshift({ label: "Before", rank: first?.previous ?? null });
  }
  return points;
}

/** Points for a team just outside the Top 20, if it got any votes. */
export const votesOutside = (poll: HockeyPoll, team: string) =>
  poll.others.find((o) => sameHockeyTeam(o.team, team))?.points;
