import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiEvent as event,
  parseResponse as parse,
  sentCommands,
  type CommandLike,
} from "../shared/testing";

const { send } = vi.hoisted(() => ({
  send: vi.fn<(cmd: CommandLike) => Promise<unknown>>(),
}));
vi.mock("../shared/db", () => ({ db: { send } }));

process.env.TABLE_NAME = "Poker";
process.env.USERS_TABLE = "Users";
const { handler } = await import("./handler");

const G = "POKER#GROUP";
const seat = (name: string) => ({ name, buyIns: 1, finalChips: null });
const ann = { pk: G, sk: "PLAYER#a", name: "Ann", userId: "u1" };
const bob = { pk: G, sk: "PLAYER#b", name: "Bob" };
const settled = {
  pk: G,
  sk: "GAME#1",
  status: "COMPLETED",
  countsForStats: true,
  players: { "PLAYER#a": seat("Ann"), "PLAYER#b": seat("Bob") },
  settlements: [
    { from: "Bob", fromId: "PLAYER#b", to: "Ann", toId: "PLAYER#a", amount: 5 },
  ],
};
const running = {
  pk: G,
  sk: "GAME#2",
  status: "ACTIVE",
  players: { "PLAYER#b": seat("Bob") },
};

function respond(
  profile: object | undefined,
  items: object[] = [ann, settled, bob, running],
) {
  send.mockImplementation(async (cmd) => {
    if (cmd.constructor.name === "GetCommand") return { Item: profile };
    if (cmd.constructor.name === "QueryCommand") return { Items: items };
    return {};
  });
}

const player = { permissions: { poker: true } };
const statsPlayer = { permissions: { poker: true, pokerStats: true } };
const pokerWrites = () =>
  sentCommands(send).filter(
    (c) => c.input.TableName === "Poker" && c.name !== "QueryCommand",
  );

beforeEach(() => {
  send.mockReset();
});

describe("poker access", () => {
  it("needs the poker permission", async () => {
    respond({ permissions: { bills: true } });
    expect(parse(await handler(event("GET /poker")))).toEqual({
      status: 403,
      body: { error: "Poker access required" },
    });
    respond(undefined);
    expect((await handler(event("GET /poker"))).statusCode).toBe(403);
  });

  it("lets admins in and stamps lastUsedPoker", async () => {
    respond({ role: "ADMIN" });
    expect((await handler(event("GET /poker"))).statusCode).toBe(200);
    const stamp = sentCommands(send).find((c) => c.name === "UpdateCommand");
    expect(stamp?.input).toMatchObject({
      TableName: "Users",
      Key: { pk: "USER#u1" },
    });
    expect(Object.values(stamp?.input.ExpressionAttributeNames ?? {})).toEqual([
      "lastUsedPoker",
    ]);
  });

  it("answers routes it doesn't serve with 404", async () => {
    respond(player);
    expect(parse(await handler(event("PUT /poker")))).toEqual({
      status: 404,
      body: { error: "Not found" },
    });
  });
});

describe("poker reads", () => {
  it("lists the roster first, then the games", async () => {
    respond(player);
    const res = parse(await handler(event("GET /poker")));
    expect(res).toEqual({ status: 200, body: [ann, bob, settled, running] });
    const query = sentCommands(send).find((c) => c.name === "QueryCommand");
    expect(query?.input).toEqual({
      TableName: "Poker",
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": G },
    });
  });

  it("lists everything for GET /poker/{id} too", async () => {
    respond(player);
    const res = parse(
      await handler(event("GET /poker/{id}", { pathParameters: { id: "x" } })),
    );
    expect(res.body).toHaveLength(4);
  });

  it("returns Hall of Fame games only with stats access", async () => {
    respond(player);
    expect(parse(await handler(event("GET /poker/stats")))).toEqual({
      status: 403,
      body: { error: "Stats access required" },
    });
    respond(statsPlayer);
    expect(parse(await handler(event("GET /poker/stats")))).toEqual({
      status: 200,
      body: [settled],
    });
  });

  it("returns my claimed players and their completed games", async () => {
    respond(player);
    expect(parse(await handler(event("GET /poker/mystats")))).toEqual({
      status: 200,
      body: { playerIds: ["PLAYER#a"], games: [settled] },
    });
  });
});

describe("poker roster", () => {
  it("adds a player with a new PLAYER# key", async () => {
    respond(player);
    const res = parse(
      await handler(
        event("POST /poker", { body: { pk: "PLAYER", name: "Cy" } }),
      ),
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      pk: G,
      sk: expect.stringMatching(/^PLAYER#[0-9a-f-]{36}$/),
      name: "Cy",
    });
    expect(pokerWrites()).toEqual([
      { name: "PutCommand", input: { TableName: "Poker", Item: res.body } },
    ]);
  });

  it("renames a player and every game they sat in", async () => {
    respond(player);
    const res = parse(
      await handler(
        event("POST /poker", {
          body: {
            action: "RENAME_PLAYER",
            playerId: "PLAYER#b",
            name: " Robert ",
          },
        }),
      ),
    );
    expect(res).toEqual({ status: 200, body: { updated: true } });
    expect(pokerWrites().map((c) => c.input)).toEqual([
      {
        TableName: "Poker",
        Key: { pk: G, sk: "PLAYER#b" },
        UpdateExpression: "SET #name = :name",
        ExpressionAttributeNames: { "#name": "name" },
        ExpressionAttributeValues: { ":name": "Robert" },
      },
      {
        TableName: "Poker",
        Key: { pk: G, sk: "GAME#1" },
        UpdateExpression:
          "SET players.#pid.#name = :name, settlements = :settlements",
        ExpressionAttributeNames: { "#pid": "PLAYER#b", "#name": "name" },
        ExpressionAttributeValues: {
          ":name": "Robert",
          ":settlements": [{ ...settled.settlements[0], from: "Robert" }],
        },
      },
      {
        TableName: "Poker",
        Key: { pk: G, sk: "GAME#2" },
        UpdateExpression: "SET players.#pid.#name = :name",
        ExpressionAttributeNames: { "#pid": "PLAYER#b", "#name": "name" },
        ExpressionAttributeValues: { ":name": "Robert" },
      },
    ]);
  });

  it("needs a player and a name to rename", async () => {
    respond(player);
    const body = { action: "RENAME_PLAYER", playerId: "PLAYER#b", name: "  " };
    expect(parse(await handler(event("POST /poker", { body })))).toEqual({
      status: 400,
      body: { error: "playerId and name required" },
    });
  });

  it("claims a player, releasing the one I had", async () => {
    respond(player);
    const res = parse(
      await handler(
        event("POST /poker", {
          body: { action: "CLAIM_PLAYER", playerId: "PLAYER#b" },
        }),
      ),
    );
    expect(res).toEqual({ status: 200, body: { claimed: "PLAYER#b" } });
    expect(pokerWrites().map((c) => c.input)).toEqual([
      {
        TableName: "Poker",
        Key: { pk: G, sk: "PLAYER#a" },
        UpdateExpression: "REMOVE userId",
      },
      {
        TableName: "Poker",
        Key: { pk: G, sk: "PLAYER#b" },
        UpdateExpression: "SET userId = :uid",
        ExpressionAttributeValues: { ":uid": "u1" },
      },
    ]);
  });

  it("can't claim a player who isn't on the roster", async () => {
    respond(player);
    const body = { action: "CLAIM_PLAYER", playerId: "GAME#1" };
    expect(parse(await handler(event("POST /poker", { body })))).toEqual({
      status: 404,
      body: { error: "Player not found" },
    });
  });

  it("unclaims every player I had", async () => {
    respond(player);
    const res = parse(
      await handler(
        event("POST /poker", { body: { action: "UNCLAIM_PLAYER" } }),
      ),
    );
    expect(res).toEqual({ status: 200, body: { claimed: null } });
    expect(pokerWrites().map((c) => c.input.Key)).toEqual([
      { pk: G, sk: "PLAYER#a" },
    ]);
  });

  it("deletes by the decoded path id", async () => {
    respond(player);
    const res = parse(
      await handler(
        event("DELETE /poker/{id}", { pathParameters: { id: "GAME%232" } }),
      ),
    );
    expect(res).toEqual({ status: 200, body: { message: "Deleted" } });
    expect(pokerWrites()).toEqual([
      {
        name: "DeleteCommand",
        input: { TableName: "Poker", Key: { pk: G, sk: "GAME#2" } },
      },
    ]);
  });

  it("fails a missing or bad body with a 500, as before", async () => {
    respond(player);
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await handler(event("POST /poker"))).statusCode).toBe(500);
    expect(
      (await handler(event("POST /poker", { body: "{bad" }))).statusCode,
    ).toBe(500);
  });
});
