import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiEvent as event,
  parseResponse as parse,
  sentCommands,
  type CommandLike,
} from "../shared/testing";

// Handler-level tests for POST /poker { action: "END_GAME" }.

const { send } = vi.hoisted(() => ({
  send: vi.fn<(cmd: CommandLike) => Promise<unknown>>(),
}));
vi.mock("../shared/db", () => ({ db: { send } }));

process.env.TABLE_NAME = "Poker";
process.env.USERS_TABLE = "Users";
const { handler } = await import("./handler");

const G = "POKER#GROUP";
const game = {
  pk: G,
  sk: "GAME#1",
  status: "ACTIVE",
  buyInAmount: 10,
  chipsPerBuyIn: 10000,
  date: "2026-09-30T00:00:00.000Z",
  players: {
    a: { name: "Ann", buyIns: 1, finalChips: 15000 },
    b: { name: "Bob", buyIns: 1, finalChips: null },
  },
};
const conditionFailed = Object.assign(new Error("failed"), {
  name: "ConditionalCheckFailedException",
});

function respond(
  profile: object,
  stored: object | null = game,
  failWrites = false,
) {
  send.mockImplementation(async (cmd) => {
    const table = cmd.input.TableName;
    if (cmd.constructor.name === "GetCommand")
      return { Item: table === "Users" ? profile : (stored ?? undefined) };
    if (failWrites && table === "Poker") throw conditionFailed;
    return {};
  });
}

const player = { permissions: { poker: true } };
const statsPlayer = { permissions: { poker: true, pokerStats: true } };
const endGame = async (extra: object = {}) =>
  parse(
    await handler(
      event("POST /poker", {
        body: {
          action: "END_GAME",
          game: { sk: "GAME#1" },
          finalChips: { b: 5000 },
          ...extra,
        },
      }),
    ),
  );
const lastWrite = () =>
  sentCommands(send)
    .filter((c) => c.input.TableName === "Poker")
    .at(-1);

const settledPlayers = {
  a: { name: "Ann", buyIns: 1, finalChips: 15000, net: 5 },
  b: { name: "Bob", buyIns: 1, finalChips: 5000, net: -5 },
};
const settlements = [
  { from: "Bob", fromId: "b", to: "Ann", toId: "a", amount: 5 },
];

beforeEach(() => {
  send.mockReset();
});

describe("END_GAME", () => {
  it("saves the settled game to history while it's still active", async () => {
    respond(statsPlayer);
    const res = await endGame({ includeInStats: true });
    expect(res).toEqual({
      status: 200,
      body: {
        ...game,
        status: "COMPLETED",
        players: settledPlayers,
        settlements,
        countsForStats: true,
        recordedBy: "u1",
        completedAt: expect.any(String),
        saved: true,
      },
    });
    const item = { ...res.body, saved: undefined };
    expect(lastWrite()).toEqual({
      name: "PutCommand",
      input: {
        TableName: "Poker",
        Item: item,
        ConditionExpression: "#status = :active",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":active": "ACTIVE" },
      },
    });
  });

  it("only counts for stats when the settler has stats access", async () => {
    respond(player);
    expect((await endGame({ includeInStats: true })).body.countsForStats).toBe(
      false,
    );
    respond(statsPlayer);
    expect((await endGame({ includeInStats: false })).body.countsForStats).toBe(
      false,
    );
    expect((await endGame()).body.countsForStats).toBe(true);
  });

  it("just clears the game when it isn't saved to history", async () => {
    respond(player);
    expect(await endGame({ saveToHistory: false })).toEqual({
      status: 200,
      body: { players: settledPlayers, settlements, saved: false },
    });
    expect(lastWrite()).toEqual({
      name: "DeleteCommand",
      input: {
        TableName: "Poker",
        Key: { pk: G, sk: "GAME#1" },
        ConditionExpression: "#status = :active",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":active": "ACTIVE" },
      },
    });
  });

  it("says when someone else settled it first", async () => {
    const error = { error: "This game was just settled by someone else." };
    respond(player, game, true);
    expect(await endGame()).toEqual({ status: 409, body: error });
    expect(await endGame({ saveToHistory: false })).toEqual({
      status: 409,
      body: error,
    });
  });

  it("refuses games that aren't active or can't be settled", async () => {
    respond(player, { ...game, status: "COMPLETED" });
    expect(await endGame()).toEqual({
      status: 409,
      body: {
        error:
          "This game isn't active anymore. It may have already been settled.",
      },
    });
    respond(player, null);
    expect((await endGame()).status).toBe(409);
    respond(player, { ...game, buyInAmount: 0 });
    expect(await endGame()).toEqual({
      status: 400,
      body: {
        error:
          "This game has no buy-in amount or chips per buy-in, so it can't be settled.",
      },
    });
  });

  it("checks the request and the chip counts", async () => {
    respond(player);
    expect(await endGame({ game: {} })).toEqual({
      status: 400,
      body: { error: "Missing game reference" },
    });
    expect(await endGame({ finalChips: { b: -5 } })).toEqual({
      status: 400,
      body: { error: "Bob's final chips must be 0 or more" },
    });
    expect(await endGame({ finalChips: {} })).toEqual({
      status: 400,
      body: {
        error:
          "The chips don't add up: 15,000 counted but 20,000 were bought in (5,000 missing). Recount before settling.",
      },
    });
    expect(
      sentCommands(send).some(
        (c) => c.input.TableName === "Poker" && c.name !== "GetCommand",
      ),
    ).toBe(false);
  });
});
