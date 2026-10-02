import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiEvent as event,
  parseResponse as parse,
  sentCommands,
  type CommandLike,
} from "../shared/testing";

// Handler-level tests for SET_NOTES on POST /poker.

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

describe("SET_NOTES", () => {
  const body = { action: "SET_NOTES", gameSk: "GAME#1" };

  it("saves a trimmed note on any game", async () => {
    respond({});
    expect(await post({ ...body, notes: "  Jordan rivered a flush " })).toEqual(
      { status: 200, body: { updated: true, notes: "Jordan rivered a flush" } },
    );
    expect(pokerWrites()[0]?.input).toMatchObject({
      Key: { pk: G, sk: "GAME#1" },
      UpdateExpression: "SET notes = :notes",
      ConditionExpression: "attribute_exists(sk)",
      ExpressionAttributeValues: { ":notes": "Jordan rivered a flush" },
    });
  });

  it("clears an empty note", async () => {
    respond({});
    await post({ ...body, notes: "   " });
    expect(pokerWrites()[0]?.input.UpdateExpression).toBe("REMOVE notes");
  });

  it("checks the game and the length", async () => {
    respond({});
    expect(await post({ ...body, gameSk: "PLAYER#a", notes: "x" })).toEqual({
      status: 400,
      body: { error: "gameSk required" },
    });
    expect(await post({ ...body, notes: "x".repeat(281) })).toEqual({
      status: 400,
      body: { error: "Keep notes to 280 characters" },
    });
    expect(await post({ ...body, notes: 5 })).toEqual({
      status: 400,
      body: { error: "Notes must be text" },
    });
    respond({ failWrites: true });
    expect(await post({ ...body, notes: "late" })).toEqual({
      status: 404,
      body: { error: "That game doesn't exist anymore." },
    });
  });
});
