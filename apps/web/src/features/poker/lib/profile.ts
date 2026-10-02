import type { Game } from "../types";
import { round2 } from "./money";
import { chronological, finishOf, netOf, roiOf, wonNight } from "./results";

export type Outcome = "W" | "L" | "E";

export type Rival = { id: string; name: string; net: number };

export type StakeRow = {
  buyIn: number;
  games: number;
  net: number;
  roi: number;
};

export type Profile = {
  id: string;
  name: string;
  games: number;
  net: number;
  buyIns: number;
  /** Dollars put in across every buy-in. */
  spent: number;
  roi: number;
  winRate: number;
  nightsWon: number;
  avgFinish: number;
  /** Share of the group's games since their first one that they played. */
  attendance: number;
  bestNight: number;
  worstNight: number;
  currentStreak: number;
  bestStreak: number;
  /** Oldest to newest, at most five. */
  lastFive: Outcome[];
  /** Games where they bought in more than once. */
  rebuyGames: number;
  /** Of those, the ones they still finished up. */
  comebacks: number;
  /** The opponent who's taken the most from them, if anyone has. */
  nemesis: Rival | null;
  /** The opponent they've taken the most from, if anyone. */
  favoriteAtm: Rival | null;
  /** Results at each buy-in level, cheapest first. */
  byStakes: StakeRow[];
  firstPlayed: string;
};

const outcomeOf = (net: number): Outcome =>
  net > 0 ? "W" : net < 0 ? "L" : "E";

/** Money that changed hands with each opponent, from the settlements. */
function rivals(games: Game[], id: string) {
  const totals = new Map<string, Rival>();
  for (const game of games) {
    for (const s of game.settlements ?? []) {
      const other =
        s.fromId === id
          ? { id: s.toId, name: s.to, delta: -s.amount }
          : s.toId === id
            ? { id: s.fromId, name: s.from, delta: s.amount }
            : null;
      if (!other) continue;
      const row = totals.get(other.id) ?? { id: other.id, name: "", net: 0 };
      row.name = other.name;
      row.net = round2(row.net + other.delta);
      totals.set(other.id, row);
    }
  }
  const list = [...totals.values()];
  const worst = list.reduce<Rival | null>(
    (w, r) => (r.net < 0 && (!w || r.net < w.net) ? r : w),
    null,
  );
  const best = list.reduce<Rival | null>(
    (b, r) => (r.net > 0 && (!b || r.net > b.net) ? r : b),
    null,
  );
  return { nemesis: worst, favoriteAtm: best };
}

/**
 * One player's career across the given games (the Hall of Fame games, or
 * my own). Null when they haven't played any of them.
 */
export function playerProfile(allGames: Game[], id: string): Profile | null {
  const pool = chronological(allGames);
  const played = pool.filter((g) => g.players?.[id]);
  const first = played[0];
  if (!first) return null;

  let net = 0;
  let buyIns = 0;
  let spent = 0;
  let wins = 0;
  let nightsWon = 0;
  let finishes = 0;
  let best = -Infinity;
  let worst = Infinity;
  let streak = 0;
  let bestStreak = 0;
  let rebuyGames = 0;
  let comebacks = 0;
  let name = "";
  const outcomes: Outcome[] = [];
  const stakes = new Map<number, StakeRow & { spent: number }>();

  for (const game of played) {
    const seat = game.players[id];
    if (!seat) continue;
    const n = netOf(game, id);
    const paid = seat.buyIns * game.buyInAmount;
    name = seat.name;
    net += n;
    buyIns += seat.buyIns;
    spent += paid;
    finishes += finishOf(game, id);
    best = Math.max(best, n);
    worst = Math.min(worst, n);
    if (n > 0) wins += 1;
    if (wonNight(game, id)) nightsWon += 1;
    if (seat.buyIns > 1) {
      rebuyGames += 1;
      if (n > 0) comebacks += 1;
    }
    if (n > 0) streak = streak > 0 ? streak + 1 : 1;
    else if (n < 0) streak = streak < 0 ? streak - 1 : -1;
    else streak = 0;
    bestStreak = Math.max(bestStreak, streak);
    outcomes.push(outcomeOf(n));

    const row = stakes.get(game.buyInAmount) ?? {
      buyIn: game.buyInAmount,
      games: 0,
      net: 0,
      roi: 0,
      spent: 0,
    };
    row.games += 1;
    row.net = round2(row.net + n);
    row.spent += paid;
    stakes.set(game.buyInAmount, row);
  }

  const since = pool.length - pool.indexOf(first);
  const games = played.length;
  return {
    id,
    name,
    games,
    net: round2(net),
    buyIns,
    spent: round2(spent),
    roi: roiOf(net, spent),
    winRate: Math.round((wins / games) * 100),
    nightsWon,
    avgFinish: Math.round((finishes / games) * 10) / 10,
    attendance: Math.round((games / since) * 100),
    bestNight: round2(best),
    worstNight: round2(worst),
    currentStreak: streak,
    bestStreak,
    lastFive: outcomes.slice(-5),
    rebuyGames,
    comebacks,
    ...rivals(played, id),
    byStakes: [...stakes.values()]
      .sort((a, b) => a.buyIn - b.buyIn)
      .map(({ spent: s, ...row }) => ({ ...row, roi: roiOf(row.net, s) })),
    firstPlayed: first.completedAt ?? first.date,
  };
}
