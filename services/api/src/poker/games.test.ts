import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiEvent as event,
  parseResponse as parse,
  sentCommands,
  type CommandLike,
} from "../shared/testing";

// Handler-level tests for the game actions of POST /poker.

const { send } = vi.hoisted(() => ({
  send: vi.fn<(cmd: CommandLike) => Promise<unknown>>(),
}));
vi.mock("../shared/db", () => ({ db: { send } }));

process.env.TABLE_NAME = "Poker";
process.env.USERS_TABLE = "Users";
const { handler } = await import("./handler");

const G = "POKER#GROUP";
const conditionFailed = Object.assign(
  new Error("The conditional request failed"),
  {
    name: "ConditionalCheckFailedException",
  },
);

type Setup = {
  profile?: object;
  game?: object;
  games?: object[];
  failWrites?: boolean;
};

function respond({
  profile = { permissions: { poker: true } },
  game,
  games = [],
  failWrites,
}: Setup) {
  send.mockImplementation(async (cmd) => {
    const { name } = cmd.constructor;
    const table = cmd.input.TableName;
    if (name === "GetCommand")
      return { Item: table === "Users" ? profile : game };
    if (name === "QueryCommand") return { Items: games };
    if (failWrites && table === "Poker") throw conditionFailed;
    return {};
  });
}

const post = async (body: object) =>
  parse(await handler(event("POST /poker", { body })));
const pokerWrites = () =>
  sentCommands(send).filter(
    (c) =>
      c.input.TableName === "Poker" &&
      !["QueryCommand", "GetCommand"].includes(c.name),
  );

beforeEach(() => {
  send.mockReset();
});

describe("UPDATE_BUYIN", () => {
  const body = {
    action: "UPDATE_BUYIN",
    gameSk: "GAME#1",
    playerId: "PLAYER#a",
  };

  it("atomically adds a buy-in", async () => {
    respond({});
    expect(await post({ ...body, delta: 1 })).toEqual({
      status: 200,
      body: { updated: true },
    });
    expect(pokerWrites()[0]?.input).toEqual({
      TableName: "Poker",
      Key: { pk: G, sk: "GAME#1" },
      UpdateExpression:
        "SET players.#pid.buyIns = players.#pid.buyIns + :delta",
      ConditionExpression: "attribute_exists(players.#pid.buyIns)",
      ExpressionAttributeNames: { "#pid": "PLAYER#a" },
      ExpressionAttributeValues: { ":delta": 1 },
    });
  });

  it("never takes buy-ins below 1, and treats that as a no-op", async () => {
    respond({ failWrites: true });
    expect(await post({ ...body, delta: -1 })).toEqual({
      status: 200,
      body: { updated: true },
    });
    expect(pokerWrites()[0]?.input).toMatchObject({
      ConditionExpression: "players.#pid.buyIns > :floor",
      ExpressionAttributeValues: { ":delta": -1, ":floor": 1 },
    });
  });

  it("needs +1 or -1", async () => {
    respond({});
    expect(await post({ ...body, delta: 2 })).toEqual({
      status: 400,
      body: { error: "gameSk, playerId and delta (+1/-1) required" },
    });
  });
});

describe("UPDATE_FINAL_CHIPS", () => {
  const body = {
    action: "UPDATE_FINAL_CHIPS",
    gameSk: "GAME#1",
    playerId: "PLAYER#a",
  };

  it("saves a count (or a blank) while the game is active", async () => {
    respond({});
    expect(await post({ ...body, finalChips: "1500" })).toEqual({
      status: 200,
      body: { updated: true },
    });
    expect(pokerWrites()[0]?.input).toEqual({
      TableName: "Poker",
      Key: { pk: G, sk: "GAME#1" },
      UpdateExpression: "SET players.#pid.finalChips = :chips",
      ConditionExpression:
        "#status = :active AND attribute_exists(players.#pid)",
      ExpressionAttributeNames: { "#pid": "PLAYER#a", "#status": "status" },
      ExpressionAttributeValues: { ":chips": 1500, ":active": "ACTIVE" },
    });
    await post(body);
    expect(pokerWrites()[1]?.input.ExpressionAttributeValues).toMatchObject({
      ":chips": null,
    });
  });

  it("rejects bad counts and settled games", async () => {
    respond({});
    expect(await post({ ...body, finalChips: -1 })).toEqual({
      status: 400,
      body: { error: "Final chips must be 0 or more" },
    });
    expect(
      await post({ action: "UPDATE_FINAL_CHIPS", gameSk: "GAME#1" }),
    ).toEqual({
      status: 400,
      body: { error: "gameSk and playerId required" },
    });
    respond({ failWrites: true });
    expect(await post({ ...body, finalChips: 5 })).toEqual({
      status: 409,
      body: { error: "That game isn't active anymore." },
    });
  });
});

describe("starting a game", () => {
  const seat = (name: string) => ({ name, buyIns: 1, finalChips: null });
  const newGame = {
    pk: "GAME",
    status: "ACTIVE",
    buyInAmount: 20,
    chipsPerBuyIn: 10000,
    players: { a: seat("Ann"), b: seat("Bob"), c: seat("Cy") },
  };

  it("saves it with a new GAME# key", async () => {
    respond({});
    const res = await post(newGame);
    expect(res).toEqual({
      status: 200,
      body: {
        ...newGame,
        pk: G,
        sk: expect.stringMatching(/^GAME#[0-9a-f-]{36}$/),
      },
    });
    expect(
      sentCommands(send).find((c) => c.name === "QueryCommand")?.input,
    ).toEqual({
      TableName: "Poker",
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :game)",
      ExpressionAttributeValues: { ":pk": G, ":game": "GAME#" },
    });
  });

  it("checks the buy-in, the chips and the player count", async () => {
    respond({});
    const noBuyIn = {
      error: "Buy-in and chips per buy-in must both be more than 0.",
    };
    expect(await post({ ...newGame, buyInAmount: 0 })).toEqual({
      status: 400,
      body: noBuyIn,
    });
    expect(await post({ ...newGame, chipsPerBuyIn: "10" })).toEqual({
      status: 400,
      body: noBuyIn,
    });
    expect(await post({ ...newGame, players: { a: seat("Ann") } })).toEqual({
      status: 400,
      body: { error: "A game needs at least 2 players." },
    });
  });

  it("won't seat someone who's at another active game", async () => {
    const other = (status: string) => ({
      pk: G,
      sk: "GAME#0",
      status,
      players: { a: {}, c: {} },
    });
    respond({ games: [other("ACTIVE")] });
    expect(await post(newGame)).toEqual({
      status: 409,
      body: { error: "Ann, Cy are already in another active game." },
    });
    respond({ games: [{ ...other("ACTIVE"), players: { b: {} } }] });
    expect((await post(newGame)).body).toEqual({
      error: "Bob is already in another active game.",
    });
    respond({ games: [other("COMPLETED")] });
    expect((await post(newGame)).status).toBe(200);
  });

  it("saves an existing game as sent, without the checks", async () => {
    respond({});
    const res = await post({ pk: "GAME", sk: "GAME#1", players: {} });
    expect(res).toEqual({
      status: 200,
      body: { pk: G, sk: "GAME#1", players: {} },
    });
  });
});
