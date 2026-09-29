import { normTeam } from "../positions";
import {
  LeagueError,
  recordString,
  type LeagueWeek,
  type RawSide,
} from "../guide/types";
import type { SleeperMatchup, SleeperRoster, SleeperUser } from "./api";
import { resolvePlayer, type PlayerMap } from "./players";

type Input = {
  userId: string;
  users: SleeperUser[];
  rosters: SleeperRoster[];
  matchups: SleeperMatchup[];
  players: PlayerMap;
};

function side(
  roster: SleeperRoster,
  matchup: SleeperMatchup | undefined,
  users: SleeperUser[],
  players: PlayerMap,
): RawSide {
  const owner = users.find((u) => u.user_id === roster.owner_id);
  const starters = (matchup?.starters ?? [])
    .filter((id) => id && id !== "0")
    .flatMap((id) => {
      const p = resolvePlayer(id, players);
      if (!p) return [];
      return [
        {
          name: p.name,
          pos: p.pos,
          team: normTeam(p.team),
          points: matchup?.players_points?.[id] ?? null,
        },
      ];
    });
  return {
    name: owner?.metadata?.team_name || owner?.display_name || "Unknown team",
    record: recordString(
      roster.settings?.wins,
      roster.settings?.losses,
      roster.settings?.ties,
    ),
    score: matchup?.points ?? 0,
    starters,
  };
}

/** Your side and your opponent's for one Sleeper league and week. */
export function sleeperWeek({
  userId,
  users,
  rosters,
  matchups,
  players,
}: Input): LeagueWeek {
  const myRoster = rosters.find((r) => r.owner_id === userId);
  if (!myRoster) {
    throw new LeagueError(
      "Couldn't find your team in this league. Unlink it and link it again.",
    );
  }
  const mine = matchups.find((m) => m.roster_id === myRoster.roster_id);
  const me = side(myRoster, mine, users, players);
  // No matchups yet means the league is still drafting or it's preseason.
  if (!mine) return { kind: "notStarted", me, opp: null };

  const theirs =
    mine.matchup_id == null
      ? undefined
      : matchups.find(
          (m) =>
            m.matchup_id === mine.matchup_id &&
            m.roster_id !== myRoster.roster_id,
        );
  const oppRoster =
    theirs && rosters.find((r) => r.roster_id === theirs.roster_id);
  if (!theirs || !oppRoster) return { kind: "bye", me, opp: null };

  return {
    kind: "matchup",
    me,
    opp: side(oppRoster, theirs, users, players),
  };
}
