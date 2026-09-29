import type { GameState, NflGame } from "@lifehub/shared";
import { fetchJson } from "../../shared/fetchJson";
import { normTeam } from "../positions";

// ESPN's public NFL scoreboard (no auth). Only the fields the guide uses.
export type ScoreboardEvent = {
  id: string;
  shortName: string;
  date: string;
  competitions?: {
    status?: {
      type?: { state?: string; shortDetail?: string; description?: string };
    };
    competitors?: {
      homeAway: "home" | "away";
      score?: string;
      team: { abbreviation: string };
    }[];
    broadcasts?: { names?: string[] }[];
  }[];
};

const SEASON_TYPES: Record<string, number> = { pre: 1, regular: 2, post: 3 };

export async function fetchScoreboard(
  week: number,
  season: string,
  seasonType = "regular",
): Promise<ScoreboardEvent[]> {
  const url =
    "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard" +
    `?week=${week}&seasontype=${SEASON_TYPES[seasonType] ?? 2}&dates=${season}`;
  const res = await fetchJson<{ events?: ScoreboardEvent[] }>(url);
  return res.events ?? [];
}

const toState = (raw: string | undefined): NflGame["state"] =>
  raw === "in" || raw === "post" ? raw : "pre";

/** Each playing team's game state this week. Teams not listed are on bye. */
export function teamGameStates(events: ScoreboardEvent[]) {
  const states = new Map<string, NflGame["state"]>();
  for (const ev of events) {
    const comp = ev.competitions?.[0];
    const state = toState(comp?.status?.type?.state);
    for (const c of comp?.competitors ?? []) {
      states.set(normTeam(c.team.abbreviation), state);
    }
  }
  return (team: string): GameState => states.get(team) ?? "bye";
}

/** A scoreboard event as a guide game, before stakes are attached. */
export function toGame(
  ev: ScoreboardEvent,
): Omit<NflGame, "rootFor" | "rootAgainst"> {
  const comp = ev.competitions?.[0];
  const status = comp?.status?.type;
  return {
    id: ev.id,
    shortName: ev.shortName,
    date: ev.date,
    state: toState(status?.state),
    detail: status?.shortDetail || status?.description || "",
    broadcast: comp?.broadcasts?.[0]?.names?.[0] ?? null,
    teams: (comp?.competitors ?? []).map((c) => ({
      abbreviation: normTeam(c.team.abbreviation),
      score: c.score ?? "0",
      homeAway: c.homeAway,
    })),
  };
}
