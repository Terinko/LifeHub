import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiEvent,
  parseResponse,
  sentCommands,
  type CommandLike,
} from "../shared/testing";

const { send, app } = vi.hoisted(() => ({
  send: vi.fn<(cmd: CommandLike) => Promise<unknown>>(),
  app: vi.fn(),
}));
vi.mock("../shared/db", () => ({ db: { send } }));
vi.mock("./garmin/app", () => ({ getGarminApp: app }));

process.env.TABLE_NAME = "Run";
process.env.USERS_TABLE = "Users";
process.env.RUN_REDIRECT_URIS =
  "https://hub.example/run,http://localhost:5173/run";
const { handler } = await import("./handler");

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal("fetch", fetchMock);

const KEYS = { clientId: "client-1", clientSecret: "secret-1" };
const REDIRECT = "https://hub.example/run";

/** DynamoDB: the caller's profile, plus whatever `items` says per sort key. */
function table(items: Record<string, unknown> = {}, queried: unknown[] = []) {
  send.mockImplementation(async (cmd: CommandLike) => {
    const name = cmd.constructor.name;
    const key = cmd.input.Key as { sk?: string } | undefined;
    if (name === "GetCommand" && cmd.input.TableName === "Users") {
      return { Item: { role: "USER", permissions: { run: true } } };
    }
    if (name === "GetCommand") return { Item: items[key?.sk ?? ""] };
    if (name === "DeleteCommand") return { Attributes: items[key?.sk ?? ""] };
    if (name === "QueryCommand") return { Items: queried };
    return {};
  });
}

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

beforeEach(() => {
  send.mockReset();
  app.mockReset();
  fetchMock.mockReset();
});

describe("GET /run", () => {
  it("needs the run permission", async () => {
    send.mockResolvedValue({
      Item: { role: "USER", permissions: { hockey: true } },
    });
    const res = parseResponse(await handler(apiEvent("GET /run")));
    expect(res).toEqual({
      status: 403,
      body: { error: "Run access required" },
    });
  });

  it("shows example runs while Garmin isn't set up", async () => {
    table();
    app.mockResolvedValue(undefined);
    const res = parseResponse(await handler(apiEvent("GET /run")));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      source: "example",
      garmin: "unavailable",
    });
    expect(res.body.activities.length).toBeGreaterThan(300);
  });

  it("offers to connect when the app keys exist", async () => {
    table();
    app.mockResolvedValue(KEYS);
    const res = parseResponse(await handler(apiEvent("GET /run")));
    expect(res.body).toMatchObject({
      source: "example",
      garmin: "not-connected",
    });
  });

  it("returns the caller's own runs once connected, without the tokens", async () => {
    const stored = {
      pk: "USER#u1#RUN",
      sk: "2026-11-23T07:02:00#s1",
      id: "s1",
      start: "2026-11-23T07:02:00",
      name: "Recovery jog",
      distanceM: 9978,
      durationS: 3584,
      avgHr: 138,
    };
    table(
      {
        GARMIN: {
          garminUserId: "g1",
          accessToken: "tok",
          syncedAt: "2026-11-23T12:30:00Z",
        },
      },
      [stored],
    );
    app.mockResolvedValue(KEYS);
    const res = parseResponse(await handler(apiEvent("GET /run")));
    expect(res.body.source).toBe("garmin");
    expect(res.body.syncedAt).toBe("2026-11-23T12:30:00Z");
    expect(res.body.activities[0]).toEqual({
      id: "s1",
      start: "2026-11-23T07:02:00",
      name: "Recovery jog",
      distanceM: 9978,
      durationS: 3584,
      avgHr: 138,
    });
    expect(JSON.stringify(res.body)).not.toContain("tok");
    const queries = sentCommands(send).filter((c) => c.name === "QueryCommand");
    expect(
      queries.map(
        (q) =>
          (q.input.ExpressionAttributeValues as Record<string, string>)[":pk"],
      ),
    ).toEqual(["USER#u1#RUN", "USER#u1#VO2"]);
  });
});

describe("connecting Garmin", () => {
  it("sends the browser to Garmin's consent page with a PKCE challenge", async () => {
    table();
    app.mockResolvedValue(KEYS);
    const res = parseResponse(
      await handler(
        apiEvent("POST /run/garmin/connect", {
          body: { redirectUri: REDIRECT },
        }),
      ),
    );
    const url = new URL(res.body.url);
    expect(url.origin + url.pathname).toBe(
      "https://connect.garmin.com/oauth2Confirm",
    );
    expect(url.searchParams.get("client_id")).toBe("client-1");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("redirect_uri")).toBe(REDIRECT);
    const saved = sentCommands(send).find((c) => c.name === "PutCommand");
    expect(saved?.input.Item).toMatchObject({
      pk: "USER#u1",
      sk: `PKCE#${url.searchParams.get("state")}`,
    });
  });

  it("refuses a redirect to any other site", async () => {
    table();
    app.mockResolvedValue(KEYS);
    const res = parseResponse(
      await handler(
        apiEvent("POST /run/garmin/connect", {
          body: { redirectUri: "https://evil.example/run" },
        }),
      ),
    );
    expect(res).toEqual({
      status: 400,
      body: { error: "Unknown redirect address" },
    });
  });

  it("trades the code for tokens, links the account and asks for history", async () => {
    const state = "s".repeat(32);
    table({
      [`PKCE#${state}`]: {
        verifier: "v".repeat(64),
        createdAt: new Date().toISOString(),
      },
    });
    app.mockResolvedValue(KEYS);
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/oauth/token")) {
        return ok({
          access_token: "access",
          refresh_token: "refresh",
          expires_in: 86400,
        });
      }
      if (url.endsWith("/user/id")) return ok({ userId: "g1" });
      return new Response(null, { status: 202 });
    });

    const res = parseResponse(
      await handler(
        apiEvent("POST /run/garmin/callback", {
          body: { code: "c1", state, redirectUri: REDIRECT },
        }),
      ),
    );
    expect(res.status).toBe(200);

    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0] ?? [];
    expect(String(tokenUrl)).toBe(
      "https://connectapi.garmin.com/di-oauth2-service/oauth/token",
    );
    const form = new URLSearchParams(String(tokenInit?.body));
    expect(Object.fromEntries(form)).toMatchObject({
      grant_type: "authorization_code",
      client_id: "client-1",
      client_secret: "secret-1",
      code: "c1",
      code_verifier: "v".repeat(64),
    });

    const puts = sentCommands(send).filter((c) => c.name === "PutCommand");
    expect(
      puts.map((p) => [
        (p.input.Item as { pk: string }).pk,
        (p.input.Item as { sk: string }).sk,
      ]),
    ).toEqual([
      ["USER#u1", "GARMIN"],
      ["GARMIN#g1", "USER"],
    ]);
    const backfills = fetchMock.mock.calls
      .map(([u]) => String(u))
      .filter((u) => u.includes("/backfill/"));
    expect(backfills.length).toBeGreaterThan(20);
    expect(backfills.every((u) => !u.includes("token"))).toBe(true);
  });

  it("refuses an unknown or reused sign-in", async () => {
    table();
    app.mockResolvedValue(KEYS);
    const res = parseResponse(
      await handler(
        apiEvent("POST /run/garmin/callback", {
          body: { code: "c1", state: "s".repeat(32), redirectUri: REDIRECT },
        }),
      ),
    );
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("disconnects: deregisters with Garmin and deletes the runs", async () => {
    table({
      GARMIN: {
        garminUserId: "g1",
        accessToken: "access",
        refreshToken: "refresh",
        expiresAt: "2999-01-01T00:00:00Z",
      },
    });
    app.mockResolvedValue(KEYS);
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const res = parseResponse(await handler(apiEvent("DELETE /run/garmin")));
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      "https://apis.garmin.com/wellness-api/rest/user/registration",
    );
    expect(init?.method).toBe("DELETE");
    const deletes = sentCommands(send).filter(
      (c) => c.name === "DeleteCommand",
    );
    expect(deletes.map((d) => (d.input.Key as { pk: string }).pk)).toEqual([
      "GARMIN#g1",
      "USER#u1",
    ]);
  });
});
