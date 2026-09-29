/**
 * Pulls leagueId and teamId out of an ESPN team page link, e.g.
 * https://fantasy.espn.com/football/team?leagueId=123&teamId=7&seasonId=2026
 */
export function parseEspnTeamLink(
  text: string,
): { leagueId: string; teamId: string } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (!url.hostname.endsWith("espn.com")) return null;
  const leagueId = url.searchParams.get("leagueId");
  const teamId = url.searchParams.get("teamId");
  if (
    !leagueId ||
    !teamId ||
    !/^\d+$/.test(leagueId) ||
    !/^\d+$/.test(teamId)
  ) {
    return null;
  }
  return { leagueId, teamId };
}
