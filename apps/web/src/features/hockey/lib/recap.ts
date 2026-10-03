import {
  sameHockeyTeam,
  type HockeyPoll,
  type HockeyPollRow,
} from "@lifehub/shared";

export type Mover = { team: string; rank: number; by: number };

export type PollRecap = {
  risers: Mover[];
  fallers: Mover[];
  newcomers: string[];
  /** Ranked last week but not now; only known once two polls are saved. */
  droppedOut: string[];
  top: HockeyPollRow | undefined;
  /** The top team is new at No. 1 this week. */
  newTop: boolean;
};

const SHOWN = 3;

/** What changed in this week's poll: biggest moves, new faces, who fell out. */
export function pollRecap(poll: HockeyPoll): PollRecap {
  const moved = poll.rows.flatMap((r) =>
    r.previous === null
      ? []
      : [{ team: r.team, rank: r.rank, by: r.previous - r.rank }],
  );
  const risers = moved
    .filter((m) => m.by > 0)
    .sort((a, b) => b.by - a.by || a.rank - b.rank)
    .slice(0, SHOWN);
  const fallers = moved
    .filter((m) => m.by < 0)
    .sort((a, b) => a.by - b.by || a.rank - b.rank)
    .slice(0, SHOWN)
    .map((m) => ({ ...m, by: -m.by }));
  const newcomers = poll.rows
    .filter((r) => r.previous === null)
    .map((r) => r.team);

  const before = poll.history.at(-2);
  const droppedOut = before
    ? before.rows
        .filter(
          (old) => !poll.rows.some((r) => sameHockeyTeam(r.team, old.team)),
        )
        .map((old) => old.team)
    : [];

  const top = poll.rows[0];
  return {
    risers,
    fallers,
    newcomers,
    droppedOut,
    top,
    newTop: !!top && top.previous !== 1,
  };
}

/** "Up 3 to No. 7" style line for one team, or undefined if unranked. */
export function teamLine(poll: HockeyPoll, team: string): string | undefined {
  const row = poll.rows.find((r) => sameHockeyTeam(r.team, team));
  if (!row) return undefined;
  if (row.previous === null) return `Enters the poll at No. ${row.rank}`;
  const by = row.previous - row.rank;
  if (by > 0) return `Up ${by} to No. ${row.rank}`;
  if (by < 0) return `Down ${-by} to No. ${row.rank}`;
  return `Holds at No. ${row.rank}`;
}
