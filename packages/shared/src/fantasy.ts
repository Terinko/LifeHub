import { z } from "zod";

export const FANTASY_PLATFORMS = ["SLEEPER", "ESPN"] as const;
export type FantasyPlatform = (typeof FANTASY_PLATFORMS)[number];

/** Positions are normalized across platforms (ESPN's "D/ST" becomes "DEF"). */
export type Position = "QB" | "RB" | "WR" | "TE" | "K" | "DEF" | "OTHER";

// ---------------------------------------------------------------------------
// Linked leagues
// ---------------------------------------------------------------------------

/** A linked league as the API returns it. ESPN cookies are never sent back. */
export type LinkedLeague = {
  sk: string;
  platform: FantasyPlatform;
  leagueId: string;
  /** What the user called it; null means use leagueName. */
  nickname: string | null;
  /** The league's own name on Sleeper or ESPN, when known. */
  leagueName: string | null;
  season: string | null;
  sleeperUsername?: string;
  espnTeamId?: string;
  hasCookies: boolean;
  linkedAt: string;
};

const nickname = z
  .string()
  .trim()
  .max(60)
  .nullish()
  .transform((value) => value || null);

const id = z.coerce.string().trim().min(1);

export const espnCookiesSchema = z.object({
  espn_s2: z.string().trim().min(1),
  swid: z.string().trim().min(1),
});
export type EspnCookies = z.infer<typeof espnCookiesSchema>;

/** Body of POST /fantasy/leagues. Linking the same league again replaces it. */
export const linkLeagueSchema = z.discriminatedUnion("platform", [
  z.object({
    platform: z.literal("SLEEPER"),
    leagueId: id,
    sleeperUsername: z.string().trim().min(1),
    nickname,
  }),
  z.object({
    platform: z.literal("ESPN"),
    leagueId: id,
    espnTeamId: id,
    nickname,
    espnCookies: espnCookiesSchema.optional(),
  }),
]);
export type LinkLeagueInput = z.input<typeof linkLeagueSchema>;
export type LinkLeagueData = z.output<typeof linkLeagueSchema>;

/** Body of PUT /fantasy/leagues/{id}: rename, or replace ESPN cookies. */
export const updateLeagueSchema = z.object({
  nickname: nickname.optional(),
  espnCookies: espnCookiesSchema.optional(),
});
export type UpdateLeagueInput = z.input<typeof updateLeagueSchema>;
export type UpdateLeagueData = z.output<typeof updateLeagueSchema>;

/** One of a Sleeper user's leagues, offered in the link picker. */
export type SleeperLeagueOption = {
  leagueId: string;
  name: string;
  season: string;
  teams: number;
};

/** GET /fantasy/sleeper-leagues?username=… */
export type SleeperLeagueSearch = {
  username: string;
  displayName: string;
  season: string;
  leagues: SleeperLeagueOption[];
};

// ---------------------------------------------------------------------------
// This week's guide
// ---------------------------------------------------------------------------

/** Where a player's NFL game stands. "bye" means their team isn't playing. */
export type GameState = "pre" | "in" | "post" | "bye";

export type Starter = {
  name: string;
  pos: Position;
  team: string;
  points: number | null;
  gameState: GameState;
};

export type TeamSide = {
  name: string;
  record: string;
  score: number;
  starters: Starter[];
};

/**
 * Where a matchup stands. `lead` is your score minus theirs; the "left"
 * lists name the starters whose game hasn't finished (live counts as left).
 */
export type MatchupStatus = {
  phase: "pregame" | "live" | "final";
  lead: number;
  myLeft: string[];
  oppLeft: string[];
};

export type Matchup = {
  leagueSk: string;
  league: string;
  platform: FantasyPlatform;
  /** The league or team page on Sleeper or ESPN. */
  url: string;
  /** "bye": no opponent this week. "notStarted": the league has no matchups yet. */
  kind: "matchup" | "bye" | "notStarted";
  me: TeamSide;
  opp: TeamSide | null;
  status: MatchupStatus | null;
};

/** A player you care about, merged across every league you have them in. */
export type StakePlayer = {
  name: string;
  pos: Position;
  team: string;
  leagues: { league: string; points: number | null }[];
};

export type NflGame = {
  id: string;
  shortName: string;
  /** ISO kickoff time. */
  date: string;
  state: "pre" | "in" | "post";
  /** ESPN's short status, e.g. "3rd 4:12" or "Final". */
  detail: string;
  broadcast: string | null;
  teams: { abbreviation: string; score: string; homeAway: "home" | "away" }[];
  rootFor: StakePlayer[];
  rootAgainst: StakePlayer[];
};

export type LeagueProblem = {
  league: string;
  leagueSk?: string;
  message: string;
};

/** GET /fantasy/guide */
export type FantasyGuide = {
  week: number | null;
  season: string | null;
  leaguesLinked: number;
  matchups: Matchup[];
  byePlayers: StakePlayer[];
  games: NflGame[];
  leagueErrors: LeagueProblem[];
};
