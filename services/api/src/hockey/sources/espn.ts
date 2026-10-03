import type {
  HockeyGame,
  HockeyGameSide,
  HockeyGameState,
} from "@lifehub/shared";

// ESPN's public site API (no key; the same one espn.com's pages use).
export const ESPN_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/hockey/mens-college-hockey";

/** ESPN marks unranked teams with 99. */
const UNRANKED = 99;

type EspnScore = string | { value?: number; displayValue?: string };

type EspnCompetitor = {
  homeAway: "home" | "away";
  score?: EspnScore | null;
  winner?: boolean | null;
  curatedRank?: { current?: number };
  linescores?: { value?: number; displayValue?: string }[];
  team: {
    id: string;
    location: string;
    abbreviation: string;
    logo?: string;
    logos?: { href: string }[];
  };
};

type EspnStatus = {
  type?: { state?: string; shortDetail?: string };
};

export type EspnEvent = {
  id: string;
  date: string;
  status?: EspnStatus;
  competitions: {
    neutralSite?: boolean | null;
    venue?: { fullName?: string };
    broadcasts?: { media?: { shortName?: string }; names?: string[] }[];
    status?: EspnStatus;
    competitors: EspnCompetitor[];
  }[];
};

const scoreOf = (score: EspnScore | null | undefined) => {
  if (score === null || score === undefined) return undefined;
  const raw = typeof score === "string" ? score : score.displayValue;
  const n = Number(raw);
  return raw === undefined || raw === "" || Number.isNaN(n) ? undefined : n;
};

const STATES: HockeyGameState[] = ["pre", "in", "post"];

function sideOf(c: EspnCompetitor, state: HockeyGameState): HockeyGameSide {
  const rank = c.curatedRank?.current;
  return {
    id: c.team.id,
    name: c.team.location,
    abbr: c.team.abbreviation,
    logo: c.team.logo ?? c.team.logos?.[0]?.href,
    rank: rank && rank < UNRANKED ? rank : undefined,
    // ESPN sends "0" for games that haven't started; leave those blank.
    score: state === "pre" ? undefined : scoreOf(c.score),
    winner: c.winner ?? undefined,
    periods: (c.linescores ?? []).map((l) =>
      Number(l.displayValue ?? l.value ?? 0),
    ),
  };
}

/** One ESPN event (scoreboard or team schedule) in LifeHub's shape. */
export function toGame(event: EspnEvent): HockeyGame | undefined {
  const comp = event.competitions[0];
  if (!comp) return undefined;
  const home = comp.competitors.find((c) => c.homeAway === "home");
  const away = comp.competitors.find((c) => c.homeAway === "away");
  if (!home || !away) return undefined;

  const status = event.status ?? comp.status;
  const rawState = status?.type?.state as HockeyGameState | undefined;
  const state = rawState && STATES.includes(rawState) ? rawState : "pre";
  const game: HockeyGame = {
    id: event.id,
    start: event.date,
    state,
    detail: status?.type?.shortDetail ?? "",
    venue: comp.venue?.fullName,
    tv: (comp.broadcasts ?? [])
      .flatMap((b) => b.media?.shortName ?? b.names ?? [])
      .filter((name, i, all) => name && all.indexOf(name) === i),
    neutral: !!comp.neutralSite,
    away: sideOf(away, state),
    home: sideOf(home, state),
  };
  // Team schedules don't say who won; work it out once the game is over.
  if (state === "post" && game.home.winner === undefined) {
    const h = game.home.score ?? 0;
    const a = game.away.score ?? 0;
    if (h !== a) {
      game.home.winner = h > a;
      game.away.winner = a > h;
    }
  }
  return game;
}

export const toGames = (events: EspnEvent[] = []) =>
  events.map(toGame).filter((g): g is HockeyGame => g !== undefined);

export type EspnTeam = {
  id: string;
  location: string;
  logos?: { href: string }[];
};

export type EspnTeamsResponse = {
  sports?: { leagues?: { teams?: { team: EspnTeam }[] }[] }[];
};

export const teamsOf = (res: EspnTeamsResponse): EspnTeam[] =>
  res.sports?.[0]?.leagues?.[0]?.teams?.map((t) => t.team) ?? [];

export type EspnTeamSchedule = {
  team?: { id: string; location: string; logo?: string };
  events?: EspnEvent[];
};
