import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiEvent, parseResponse, type CommandLike } from "../shared/testing";

const { send } = vi.hoisted(() => ({
  send: vi.fn<(cmd: CommandLike) => Promise<unknown>>(),
}));
vi.mock("../shared/db", () => ({ db: { send } }));

process.env.TABLE_NAME = "Hockey";
process.env.USERS_TABLE = "Users";
const { handler } = await import("./handler");
const { clearCache } = await import("./cache");

const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal("fetch", fetchMock);

function profile(permissions: Record<string, boolean>, snapshots = []) {
  send.mockImplementation(async (cmd: CommandLike) => {
    if (cmd.constructor.name === "GetCommand") {
      return { Item: { role: "USER", permissions } };
    }
    if (cmd.constructor.name === "QueryCommand") return { Items: snapshots };
    return {};
  });
}

const respond = (body: string) =>
  fetchMock.mockResolvedValue(new Response(body, { status: 200 }));

beforeEach(() => {
  send.mockReset();
  fetchMock.mockReset();
  clearCache();
});

describe("hockey handler", () => {
  it("needs the hockey permission", async () => {
    profile({ weather: true });
    const res = parseResponse(await handler(apiEvent("GET /hockey/npi")));
    expect(res).toEqual({ status: 403, body: { error: "Hockey access required" } });
  });

  it("returns a day's scores", async () => {
    profile({ hockey: true });
    respond(fixture("espn-scoreboard.json"));
    const res = parseResponse(
      await handler(
        apiEvent("GET /hockey/scores", { query: { date: "20261002" } }),
      ),
    );
    expect(res.status).toBe(200);
    expect(res.body.date).toBe("20261002");
    expect(res.body.games).toHaveLength(4);
    expect(String(fetchMock.mock.calls[0]![0])).toContain("dates=20261002");
  });

  it("rejects a malformed date", async () => {
    profile({ hockey: true });
    const res = parseResponse(
      await handler(apiEvent("GET /hockey/scores", { query: { date: "10-2" } })),
    );
    expect(res).toEqual({ status: 400, body: { error: "date must be YYYYMMDD" } });
  });

  it("saves each new poll and returns the season so far", async () => {
    profile({ hockey: true });
    respond(fixture("ncaa-poll.html"));
    const res = parseResponse(await handler(apiEvent("GET /hockey/poll")));
    expect(res.status).toBe(200);
    expect(res.body.rows[6].team).toBe("Quinnipiac");
    expect(res.body.history).toHaveLength(1);
    const put = send.mock.calls.find(
      ([c]) => c.constructor.name === "PutCommand",
    )![0];
    expect(put.input).toMatchObject({
      ConditionExpression: "attribute_not_exists(pk)",
      Item: { pk: "POLL#USCHO", sk: "Through Games SEP. 21, 2026" },
    });
  });

  it("only looks for box scores in Quinnipiac games", async () => {
    profile({ hockey: true });
    const res = parseResponse(
      await handler(
        apiEvent("GET /hockey/box", {
          query: { date: "2026-10-02", teams: "130,2201" },
        }),
      ),
    );
    expect(res).toEqual({ status: 200, body: { available: false } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads a Quinnipiac box score from its site", async () => {
    profile({ hockey: true });
    fetchMock.mockImplementation(async (url) =>
      new Response(
        String(url).includes("boxscore")
          ? fixture("sidearm-box.html")
          : fixture("sidearm-schedule.txt"),
      ),
    );
    const res = parseResponse(
      await handler(
        apiEvent("GET /hockey/box", {
          query: { date: "2026-10-02", teams: "160,2514" },
        }),
      ),
    );
    expect(res.body).toMatchObject({ available: true, attendance: 3625 });
    expect(res.body.goals).toHaveLength(12);
  });

  it("rejects an unknown conference", async () => {
    profile({ hockey: true });
    const res = parseResponse(
      await handler(
        apiEvent("GET /hockey/standings/{conference}", {
          pathParameters: { conference: "sec" },
        }),
      ),
    );
    expect(res.status).toBe(400);
  });
});
