import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import type { FantasyGuide } from "@lifehub/shared";

type CommandLike = {
  constructor: { name: string };
  input: Record<string, unknown>;
};

const { send } = vi.hoisted(() => ({
  send: vi.fn<(cmd: CommandLike) => Promise<unknown>>(),
}));
vi.mock("../shared/db", () => ({ db: { send } }));

process.env.TABLE_NAME = "Fantasy";
process.env.USERS_TABLE = "Users";
const { handler } = await import("./handler");

function event(
  routeKey: string,
  {
    body,
    query,
    id,
  }: { body?: unknown; query?: Record<string, string>; id?: string } = {},
) {
  return {
    routeKey,
    body: body === undefined ? undefined : JSON.stringify(body),
    queryStringParameters: query,
    pathParameters: id ? { id } : undefined,
    requestContext: { authorizer: { jwt: { claims: { sub: "u1" } } } },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

const parse = (res: Awaited<ReturnType<typeof handler>>) => ({
  status: res.statusCode,
  body: JSON.parse(res.body ?? "null"),
});

const sleeperLeague = {
  pk: "USER#u1",
  sk: "LEAGUE#SLEEPER#L1",
  platform: "SLEEPER",
  leagueId: "L1",
  nickname: null,
  leagueName: "Dynasty",
  season: "2026",
  sleeperUserId: "me",
  linkedAt: "2026-09-01T00:00:00Z",
};

function respond(profile: object, leagues: object[] = []) {
  send.mockImplementation(async (cmd) => {
    const name = cmd.constructor.name;
    const table = cmd.input.TableName;
    if (name === "GetCommand" && table === "Users") return { Item: profile };
    if (name === "GetCommand") {
      // Fresh Sleeper player cache.
      return {
        Item: {
          fetchedAt: new Date().toISOString(),
          players: {
            p1: { name: "Josh Allen", team: "BUF", pos: "QB" },
            p2: { name: "Nico Collins", team: "HOU", pos: "WR" },
            p3: { name: "Travis Kelce", team: "KC", pos: "TE" },
          },
        },
      };
    }
    if (name === "QueryCommand") return { Items: leagues };
    return {};
  });
}

const fakeResponses: Record<string, unknown> = {
  "https://api.sleeper.app/v1/state/nfl": {
    week: 4,
    season: "2026",
    season_type: "regular",
  },
  "https://api.sleeper.app/v1/league/L1/users": [
    { user_id: "me", display_name: "tyler" },
    { user_id: "them", display_name: "kings" },
  ],
  "https://api.sleeper.app/v1/league/L1/rosters": [
    { roster_id: 1, owner_id: "me", settings: { wins: 3, losses: 0 } },
    { roster_id: 2, owner_id: "them", settings: { wins: 1, losses: 2 } },
  ],
  "https://api.sleeper.app/v1/league/L1/matchups/4": [
    {
      roster_id: 1,
      matchup_id: 1,
      points: 20,
      starters: ["p1", "p2"],
      players_points: { p1: 20 },
    },
    {
      roster_id: 2,
      matchup_id: 1,
      points: 8,
      starters: ["p3"],
      players_points: { p3: 8 },
    },
  ],
  "https://api.sleeper.app/v1/user/tyler": {
    user_id: "me",
    username: "tyler",
    display_name: "Tyler",
  },
  "https://api.sleeper.app/v1/league/L1": {
    league_id: "L1",
    name: "Dynasty",
    season: "2026",
  },
  scoreboard: {
    events: [
      {
        id: "g1",
        shortName: "KC @ BUF",
        date: "2026-10-04T17:00Z",
        competitions: [
          {
            status: { type: { state: "in", shortDetail: "3rd 4:12" } },
            competitors: [
              { homeAway: "home", score: "21", team: { abbreviation: "BUF" } },
              { homeAway: "away", score: "17", team: { abbreviation: "KC" } },
            ],
          },
        ],
      },
    ],
  },
};

beforeEach(() => {
  send.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("fantasy.espn.com"))
        return new Response("", { status: 401 });
      const key = url.includes("/scoreboard") ? "scoreboard" : url;
      const data = fakeResponses[key];
      return data === undefined
        ? new Response("missing", { status: 404 })
        : Response.json(data);
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("fantasy handler", () => {
  it("requires the fantasy permission", async () => {
    respond({ role: "USER" });
    expect(parse(await handler(event("GET /fantasy/leagues")))).toEqual({
      status: 403,
      body: { error: "Fantasy access required" },
    });
  });

  it("stamps lastUsedFantasy and never caches", async () => {
    respond({ permissions: { fantasy: true } });
    const res = await handler(event("GET /fantasy/leagues"));
    expect(res.headers?.["Cache-Control"]).toBe("no-store");
    const update = send.mock.calls.find(
      ([cmd]) => cmd.constructor.name === "UpdateCommand",
    )?.[0];
    expect(update?.input.ExpressionAttributeNames).toEqual({
      "#attr": "lastUsedFantasy",
    });
  });

  it("returns an empty guide with no leagues", async () => {
    respond({ role: "ADMIN" });
    const res = parse(await handler(event("GET /fantasy/guide")));
    expect(res.body).toMatchObject({ leaguesLinked: 0, matchups: [] });
  });

  it("builds the guide: matchup status, stakes and bye players", async () => {
    respond({ role: "ADMIN" }, [sleeperLeague]);
    const { status, body } = parse(await handler(event("GET /fantasy/guide")));
    const guide = body as FantasyGuide;
    expect(status).toBe(200);
    expect(guide.leagueErrors).toEqual([]);
    expect(guide.matchups[0]).toMatchObject({
      league: "Dynasty",
      kind: "matchup",
      url: "https://sleeper.com/leagues/L1",
      status: {
        phase: "live",
        lead: 12,
        myLeft: ["Josh Allen"],
        oppLeft: ["Travis Kelce"],
      },
    });
    expect(guide.byePlayers.map((p) => p.name)).toEqual(["Nico Collins"]);
    expect(guide.games[0]?.rootFor.map((p) => p.name)).toEqual(["Josh Allen"]);
    expect(guide.games[0]?.rootAgainst.map((p) => p.name)).toEqual([
      "Travis Kelce",
    ]);
  });

  it("reports one broken league without failing the guide", async () => {
    respond({ role: "ADMIN" }, [
      sleeperLeague,
      {
        ...sleeperLeague,
        sk: "LEAGUE#SLEEPER#L2",
        leagueId: "L2",
        leagueName: "Broken",
      },
    ]);
    const guide = parse(await handler(event("GET /fantasy/guide")))
      .body as FantasyGuide;
    expect(guide.matchups).toHaveLength(1);
    expect(guide.leagueErrors).toEqual([
      {
        league: "Broken",
        leagueSk: "LEAGUE#SLEEPER#L2",
        message: "Couldn't load this league right now. Try again shortly.",
      },
    ]);
  });

  it("validates new links", async () => {
    respond({ role: "ADMIN" });
    const res = parse(
      await handler(
        event("POST /fantasy/leagues", {
          body: { platform: "ESPN", leagueId: "1" },
        }),
      ),
    );
    expect(res.status).toBe(400);
  });

  it("links a Sleeper league by username and saves its name", async () => {
    respond({ role: "ADMIN" });
    const res = parse(
      await handler(
        event("POST /fantasy/leagues", {
          body: {
            platform: "SLEEPER",
            leagueId: "L1",
            sleeperUsername: "tyler ",
          },
        }),
      ),
    );
    expect(res.body).toMatchObject({
      sk: "LEAGUE#SLEEPER#L1",
      leagueName: "Dynasty",
      season: "2026",
      sleeperUsername: "tyler",
      hasCookies: false,
    });
    const put = send.mock.calls.find(
      ([cmd]) => cmd.constructor.name === "PutCommand",
    )?.[0];
    expect(put?.input.Item).toMatchObject({ sleeperUserId: "me" });
  });

  it("explains a private ESPN league when linking", async () => {
    respond({ role: "ADMIN" });
    const res = parse(
      await handler(
        event("POST /fantasy/leagues", {
          body: { platform: "ESPN", leagueId: "123", espnTeamId: "7" },
        }),
      ),
    );
    expect(res).toEqual({
      status: 400,
      body: {
        error:
          "ESPN says this league is private, so it needs your espn_s2 and SWID cookies.",
      },
    });
  });

  it("needs a username to search Sleeper leagues", async () => {
    respond({ role: "ADMIN" });
    const res = parse(await handler(event("GET /fantasy/sleeper-leagues")));
    expect(res).toEqual({
      status: 400,
      body: { error: "Enter your Sleeper username" },
    });
  });

  it("unlinks by decoded sort key", async () => {
    respond({ role: "ADMIN" });
    await handler(
      event("DELETE /fantasy/leagues/{id}", { id: "LEAGUE%23ESPN%2312" }),
    );
    const del = send.mock.calls.find(
      ([cmd]) => cmd.constructor.name === "DeleteCommand",
    )?.[0];
    expect(del?.input.Key).toEqual({ pk: "USER#u1", sk: "LEAGUE#ESPN#12" });
  });
});
