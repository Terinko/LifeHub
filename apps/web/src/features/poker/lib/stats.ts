import type { Game, Seat } from "../types";
import { round2 } from "./money";
import { finishOf, roiOf, wonNight } from "./results";

const byCompletion = (a: Game, b: Game) =>
  new Date(a.completedAt ?? a.date).getTime() -
  new Date(b.completedAt ?? b.date).getTime();

/** My seat in a game, when one of my claimed players sat in it. */
function mySeat(game: Game, playerIds: string[]): [string, Seat] | undefined {
  return Object.entries(game.players ?? {}).find(([id]) =>
    playerIds.includes(id),
  );
}

export type MyStats = {
  gamesPlayed: number;
  netTotal: number;
  buyInsTotal: number;
  winRate: number;
  biggestWin: number;
  biggestLoss: number;
  avgNet: number;
  bestStreak: number;
  /** Positive: winning streak. Negative: losing streak. */
  currentStreak: number;
};

export function myStats(games: Game[], playerIds: string[]): MyStats | null {
  let gamesPlayed = 0;
  let netTotal = 0;
  let buyInsTotal = 0;
  let wins = 0;
  let biggestWin = 0;
  let biggestLoss = 0;
  let bestStreak = 0;
  let streak = 0;

  for (const game of [...games].sort(byCompletion)) {
    const seat = mySeat(game, playerIds)?.[1];
    if (!seat) continue;
    const net = seat.net ?? 0;
    gamesPlayed += 1;
    netTotal += net;
    buyInsTotal += seat.buyIns;
    biggestWin = Math.max(biggestWin, net);
    biggestLoss = Math.min(biggestLoss, net);
    if (net > 0) {
      wins += 1;
      streak = streak > 0 ? streak + 1 : 1;
    } else if (net < 0) {
      streak = streak < 0 ? streak - 1 : -1;
    } else {
      streak = 0;
    }
    bestStreak = Math.max(bestStreak, streak);
  }

  if (gamesPlayed === 0) return null;
  return {
    gamesPlayed,
    netTotal: round2(netTotal),
    buyInsTotal,
    winRate: Math.round((wins / gamesPlayed) * 100),
    biggestWin: round2(biggestWin),
    biggestLoss: round2(biggestLoss),
    avgNet: round2(netTotal / gamesPlayed),
    bestStreak,
    currentStreak: streak,
  };
}

/** Cumulative and per-game results for my bankroll charts. */
export function bankroll(games: Game[], playerIds: string[]) {
  let cumulative = 0;
  const points: { game: number; net: number; cumulative: number }[] = [];
  for (const game of [...games].sort(byCompletion)) {
    const seat = mySeat(game, playerIds)?.[1];
    if (!seat) continue;
    cumulative += seat.net ?? 0;
    points.push({
      game: points.length + 1,
      net: round2(seat.net ?? 0),
      cumulative: round2(cumulative),
    });
  }
  return points;
}

export type HeadToHead = { id: string; name: string; net: number };

/** Money that changed hands between me and each opponent, best first. */
export function headToHead(games: Game[], playerIds: string[]): HeadToHead[] {
  const totals = new Map<string, HeadToHead>();
  for (const game of games) {
    const myId = mySeat(game, playerIds)?.[0];
    if (!myId) continue;
    for (const s of game.settlements ?? []) {
      const theirs =
        s.fromId === myId
          ? { id: s.toId, name: s.to, delta: -s.amount }
          : s.toId === myId
            ? { id: s.fromId, name: s.from, delta: s.amount }
            : null;
      if (!theirs) continue;
      const row = totals.get(theirs.id) ?? {
        id: theirs.id,
        name: theirs.name,
        net: 0,
      };
      row.name = theirs.name;
      row.net = round2(row.net + theirs.delta);
      totals.set(theirs.id, row);
    }
  }
  return [...totals.values()].sort((a, b) => b.net - a.net);
}

export type LeaderRow = {
  id: string;
  name: string;
  net: number;
  games: number;
  buyIns: number;
  winRate: number;
  avgNet: number;
  /** Profit per dollar put in, as a whole percent. */
  roi: number;
  nightsWon: number;
  avgFinish: number;
};

export type LeaderSort = "net" | "roi" | "winRate" | "nightsWon";

/** Best first by the chosen measure; lifetime net breaks ties. */
export const sortLeaders = (rows: LeaderRow[], by: LeaderSort) =>
  [...rows].sort((a, b) => b[by] - a[by] || b.net - a.net);

/** Everyone's lifetime results across Hall of Fame games, best first. */
export function leaderboard(games: Game[]): LeaderRow[] {
  type Tally = LeaderRow & { wins: number; spent: number; finishes: number };
  const rows = new Map<string, Tally>();
  for (const game of [...games].sort(byCompletion)) {
    for (const [id, seat] of Object.entries(game.players ?? {})) {
      const row = rows.get(id) ?? {
        id,
        name: seat.name,
        net: 0,
        games: 0,
        buyIns: 0,
        wins: 0,
        winRate: 0,
        avgNet: 0,
        roi: 0,
        nightsWon: 0,
        avgFinish: 0,
        spent: 0,
        finishes: 0,
      };
      row.name = seat.name;
      row.spent += seat.buyIns * game.buyInAmount;
      row.finishes += finishOf(game, id);
      if (wonNight(game, id)) row.nightsWon += 1;
      row.net += seat.net ?? 0;
      row.games += 1;
      row.buyIns += seat.buyIns;
      if ((seat.net ?? 0) > 0) row.wins += 1;
      rows.set(id, row);
    }
  }
  return [...rows.values()]
    .map(({ wins, spent, finishes, ...row }) => ({
      ...row,
      net: round2(row.net),
      winRate: Math.round((wins / row.games) * 100),
      avgNet: round2(row.net / row.games),
      roi: roiOf(row.net, spent),
      avgFinish: Math.round((finishes / row.games) * 10) / 10,
    }))
    .sort((a, b) => b.net - a.net);
}

export type Award = { name: string; value: number } | null;

export type HallOfFame = {
  /** Most buy-ins in one night while still finishing up. */
  houdini: Award;
  /** Biggest profit off exactly one buy-in. */
  roiKing: Award;
  /** Biggest gap between best and worst night. */
  rollercoaster: Award;
  /** Lifetime net closest to zero. */
  swissBank: Award;
  /** Most games played. */
  ironMan: Award;
};

export function hallOfFame(games: Game[]): HallOfFame | null {
  if (games.length === 0) return null;
  let houdini: Award = null;
  let roiKing: Award = null;
  const swings = new Map<
    string,
    { name: string; best: number; worst: number }
  >();

  for (const game of games) {
    for (const [id, seat] of Object.entries(game.players ?? {})) {
      const net = seat.net ?? 0;
      if (net > 0 && seat.buyIns > (houdini?.value ?? 0))
        houdini = { name: seat.name, value: seat.buyIns };
      if (seat.buyIns === 1 && net > (roiKing?.value ?? 0))
        roiKing = { name: seat.name, value: round2(net) };
      const swing = swings.get(id) ?? {
        name: seat.name,
        best: net,
        worst: net,
      };
      swing.name = seat.name;
      swing.best = Math.max(swing.best, net);
      swing.worst = Math.min(swing.worst, net);
      swings.set(id, swing);
    }
  }

  const board = leaderboard(games);
  const widest = [...swings.values()].sort(
    (a, b) => b.best - b.worst - (a.best - a.worst),
  )[0];
  const even = [...board].sort((a, b) => Math.abs(a.net) - Math.abs(b.net))[0];
  const most = [...board].sort((a, b) => b.games - a.games)[0];

  return {
    houdini,
    roiKing,
    rollercoaster:
      widest && widest.best - widest.worst > 0
        ? { name: widest.name, value: round2(widest.best - widest.worst) }
        : null,
    swissBank: even ? { name: even.name, value: even.net } : null,
    ironMan: most ? { name: most.name, value: most.games } : null,
  };
}

/** Games per month for the activity chart, oldest first. */
export function monthlyActivity(games: Game[]) {
  const counts = new Map<string, number>();
  for (const game of games) {
    const d = new Date(game.completedAt ?? game.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => {
      const [y = 0, m = 1] = key.split("-").map(Number);
      return {
        month: new Date(y, m - 1, 1).toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        count,
      };
    });
}
