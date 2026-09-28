import type { LinkedLeague } from "@lifehub/shared";

const PLATFORM = { SLEEPER: "Sleeper", ESPN: "ESPN" } as const;

export const platformName = (league: Pick<LinkedLeague, "platform">) =>
  PLATFORM[league.platform];

/** Your nickname, else the league's own name, else a readable fallback. */
export const leagueTitle = (league: LinkedLeague) =>
  league.nickname ||
  league.leagueName ||
  `${platformName(league)} league ${league.leagueId.slice(-4)}`;

export function leagueDetail(league: LinkedLeague) {
  const parts: string[] = [platformName(league)];
  if (league.platform === "SLEEPER" && league.sleeperUsername) {
    parts.push(league.sleeperUsername);
  }
  if (league.platform === "ESPN") {
    parts.push(`Team ${league.espnTeamId ?? "?"}`);
    if (league.hasCookies) parts.push("Private");
  }
  if (league.season) parts.push(league.season);
  return parts.join(" · ");
}

/** Initials for the league tile, e.g. "DD" for "Dynasty Degenerates". */
export const leagueMonogram = (league: LinkedLeague) =>
  leagueTitle(league)
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
