import type { Position, Starter } from "@lifehub/shared";

const ORDER: Position[] = ["QB", "RB", "WR", "TE", "OTHER", "K", "DEF"];
const rank = (s: Starter) => ORDER.indexOf(s.pos);

export type LineupRow = { mine?: Starter; theirs?: Starter };

/**
 * Both lineups side by side, sorted by position so a QB faces a QB. Sleeper
 * already lists starters in slot order; ESPN doesn't, so both get sorted.
 */
export function pairLineups(mine: Starter[], theirs: Starter[]): LineupRow[] {
  const a = [...mine].sort((x, y) => rank(x) - rank(y));
  const b = [...theirs].sort((x, y) => rank(x) - rank(y));
  return Array.from({ length: Math.max(a.length, b.length) }, (_, i) => ({
    mine: a[i],
    theirs: b[i],
  }));
}

/** "TR" for "Tyler's Team". */
export const initials = (name: string) =>
  name
    .replace(/['’]s\b/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

/** "J. Allen" for "Josh Allen", so lineups fit side by side on a phone. */
export function shortName(name: string) {
  const [first, ...rest] = name.split(" ");
  if (!first || rest.length === 0 || rest.at(-1) === "Defense") return name;
  return `${first[0]}. ${rest.join(" ")}`;
}
