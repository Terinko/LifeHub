import {
  hockeyTeamKey,
  HOCKEY_CONFERENCES,
  type HockeyBoxScore,
  type HockeyConference,
  type HockeyNpi,
  type HockeyPoll,
  type HockeyScoreboard,
  type HockeyStandings,
  type HockeyTeamOption,
  type HockeyTeamSchedule,
  type HockeyTeamStats,
} from "@lifehub/shared";
import { fetchJson, fetchText } from "../shared/fetchJson";
import { notFound } from "../shared/http";
import { cached } from "./cache";
import { listPollSnapshots, savePollSnapshot } from "./repository";
import { parseStats, STATS_URL } from "./sources/sidearmStats";
import { NPI_URL, parseNpi, parseStandings, standingsUrl } from "./sources/chn";
import {
  ESPN_BASE,
  teamsOf,
  toGames,
  type EspnEvent,
  type EspnTeamSchedule,
  type EspnTeamsResponse,
} from "./sources/espn";
import { parsePoll, POLL_URL } from "./sources/poll";
import {
  boxScoreLinks,
  parseBoxScore,
  QUINNIPIAC_ESPN_ID,
  SCHEDULE_URL,
} from "./sources/sidearm";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

// Some sites turn away requests without a browser-like user agent.
const PAGE_HEADERS = {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; LifeHub/1.0; personal hockey scoreboard)",
  },
};
const page = (url: string) => fetchText(url, PAGE_HEADERS, 15 * SECOND);

/** D-I teams that play in no conference, so no standings page lists them. */
const INDEPENDENTS = [
  "Alaska",
  "Alaska Anchorage",
  "Lindenwood",
  "Long Island University",
  "Stonehill",
];

export function getScores(date: string): Promise<HockeyScoreboard> {
  return cached(`scores:${date}`, 20 * SECOND, async () => {
    const res = await fetchJson<{ events?: EspnEvent[] }>(
      `${ESPN_BASE}/scoreboard?dates=${date}&limit=300`,
    );
    const games = toGames(res.events).sort((a, b) =>
      a.start.localeCompare(b.start),
    );
    return { date, games };
  });
}

export function getNpi(): Promise<HockeyNpi> {
  return cached("npi", 30 * MINUTE, async () => ({
    rows: parseNpi(await page(NPI_URL)),
  }));
}

export function getStandings(
  conference: HockeyConference,
): Promise<HockeyStandings> {
  return cached(`standings:${conference}`, 30 * MINUTE, async () => ({
    conference,
    rows: parseStandings(await page(standingsUrl(conference))),
  }));
}

export async function getPoll(): Promise<HockeyPoll> {
  const latest = await cached("poll", HOUR, async () =>
    parsePoll(await page(POLL_URL)),
  );
  const current = {
    through: latest.through,
    seenAt: new Date().toISOString(),
    rows: latest.rows,
  };
  await savePollSnapshot(current);
  const history = await listPollSnapshots();
  const saved = history.find((s) => s.through === current.through);
  return {
    ...latest,
    seenAt: saved?.seenAt ?? current.seenAt,
    history: saved ? history : [...history, current],
  };
}

/** Every D-I team, matched to its ESPN id, for the team picker. */
export function getTeams(): Promise<HockeyTeamOption[]> {
  return cached("teams", 12 * HOUR, async () => {
    // One conference page being down shouldn't hide every other team.
    const [espn, settled] = await Promise.all([
      fetchJson<EspnTeamsResponse>(`${ESPN_BASE}/teams?limit=500`),
      Promise.allSettled(HOCKEY_CONFERENCES.map((c) => getStandings(c))),
    ]);
    const pages = settled.flatMap((r) =>
      r.status === "fulfilled" ? [r.value] : [],
    );
    if (pages.length === 0) throw new Error("No conference pages loaded");
    const byKey = new Map(
      teamsOf(espn).map((t) => [hockeyTeamKey(t.location), t]),
    );
    const members: [string, HockeyTeamOption["conference"]][] = [
      ...pages.flatMap((p) =>
        p.rows.map((r) => [r.team, p.conference] as [string, HockeyConference]),
      ),
      ...INDEPENDENTS.map((name) => [name, "ind"] as [string, "ind"]),
    ];
    return (
      members
        .flatMap(([name, conference]) => {
          const team = byKey.get(hockeyTeamKey(name));
          return team
            ? [
                {
                  id: team.id,
                  name: team.location,
                  logo: team.logos?.[0]?.href,
                  conference,
                },
              ]
            : [];
        })
        // A school is listed once, under the first conference that claims it.
        .filter((t, i, all) => all.findIndex((o) => o.id === t.id) === i)
        .sort((a, b) => a.name.localeCompare(b.name))
    );
  });
}

export function getTeamSchedule(id: string): Promise<HockeyTeamSchedule> {
  return cached(`team:${id}`, 5 * MINUTE, async () => {
    const [res, teams] = await Promise.all([
      fetchJson<EspnTeamSchedule>(`${ESPN_BASE}/teams/${id}/schedule`),
      getTeams().catch(() => [] as HockeyTeamOption[]),
    ]);
    if (!res.team) throw notFound("No such team");
    const team = teams.find((t) => t.id === id) ?? {
      id,
      name: res.team.location,
      logo: res.team.logo,
      conference: "ind" as const,
    };
    const games = toGames(res.events).sort((a, b) =>
      a.start.localeCompare(b.start),
    );
    return { team, games };
  });
}

/**
 * A full box score when one side is Quinnipiac and its site has posted
 * one for that date; otherwise `available: false`.
 */
export async function getBoxScore(
  teamIds: string[],
  date: string,
): Promise<HockeyBoxScore> {
  if (!teamIds.includes(QUINNIPIAC_ESPN_ID)) return { available: false };
  const links = await cached("sidearm:links", 10 * MINUTE, async () =>
    boxScoreLinks(await page(SCHEDULE_URL)),
  );
  const url = links.get(date);
  if (!url) return { available: false };
  const box = await cached(`sidearm:box:${url}`, 10 * MINUTE, async () =>
    parseBoxScore(await page(url)),
  );
  return { available: true, ...box, source: url };
}

/** Quinnipiac's season skater and goalie stats. */
export function getStats(): Promise<HockeyTeamStats> {
  return cached("sidearm:stats", 30 * MINUTE, async () => ({
    ...parseStats(await page(STATS_URL)),
    source: STATS_URL,
  }));
}
