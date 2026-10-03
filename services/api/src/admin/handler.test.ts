import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiEvent as event,
  parseResponse as parse,
  sentCommands,
  type CommandLike,
} from "../shared/testing";

const { send, cognitoSend } = vi.hoisted(() => ({
  send: vi.fn<(cmd: CommandLike) => Promise<unknown>>(),
  cognitoSend: vi.fn<(cmd: CommandLike) => Promise<unknown>>(),
}));
vi.mock("../shared/db", () => ({ db: { send } }));
vi.mock(
  "@aws-sdk/client-cognito-identity-provider",
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    CognitoIdentityProviderClient: class {
      send = cognitoSend;
    },
  }),
);

// The admin Lambda's TABLE_NAME is the users table; it has no USERS_TABLE.
process.env.TABLE_NAME = "Users";
delete process.env.USERS_TABLE;
process.env.USER_POOL_ID = "pool";
const { handler } = await import("./handler");

const friend = {
  pk: "USER#f1",
  email: "f@x.com",
  role: "USER",
  permissions: { poker: true },
};

/** Answers GetCommand from `users` by pk, and Scan with all of them. */
function respond(users: Record<string, unknown>[]) {
  send.mockImplementation(async (cmd) => {
    const { name } = cmd.constructor;
    const key = cmd.input.Key as { pk?: unknown } | undefined;
    if (name === "GetCommand")
      return { Item: users.find((u) => u.pk === key?.pk) };
    if (name === "ScanCommand") return { Items: users };
    return {};
  });
}

const sent = () => sentCommands(send);
const writes = () =>
  sent().filter((c) => !["GetCommand", "ScanCommand"].includes(c.name));

beforeEach(() => {
  send.mockReset();
  cognitoSend.mockReset();
});

describe("admin handler: the caller's own profile", () => {
  it("returns my profile, stamps lastActiveAt and lists unseen news", async () => {
    const me = {
      ...friend,
      pk: "USER#u1",
      permissions: { weather: true },
      lastSeenChangelogAt: "2026-09-01T00:00:00.000Z",
    };
    respond([me]);
    const res = parse(
      await handler(event("GET /admin/users", { query: { me: "true" } })),
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ...me,
      lastActiveAt: expect.any(String),
      unseenChangelog: [
        expect.objectContaining({ id: "2026-09-28-weather-tool" }),
      ],
    });
    expect(writes()).toEqual([
      {
        name: "UpdateCommand",
        input: {
          TableName: "Users",
          Key: { pk: "USER#u1" },
          UpdateExpression:
            "SET lastActiveAt = :now, lastSeenChangelogAt = if_not_exists(lastSeenChangelogAt, :now)",
          ExpressionAttributeValues: { ":now": res.body.lastActiveAt },
        },
      },
    ]);
  });

  it("makes the very first sign-in the root admin", async () => {
    respond([]);
    const res = parse(
      await handler(
        event("GET /admin/users", {
          query: { me: "true" },
          claims: { email: "root@x.com" },
        }),
      ),
    );
    const now = res.body.createdAt;
    expect(res).toEqual({
      status: 200,
      body: {
        pk: "USER#u1",
        email: "root@x.com",
        role: "ADMIN",
        permissions: {
          bills: true,
          kitchen: true,
          poker: true,
          pokerStats: true,
          fantasy: true,
          weather: true,
          hockey: true,
        },
        createdAt: now,
        lastActiveAt: now,
        lastSeenChangelogAt: now,
        unseenChangelog: [],
      },
    });
    const item = { ...res.body, unseenChangelog: undefined };
    expect(writes()).toEqual([
      { name: "PutCommand", input: { TableName: "Users", Item: item } },
    ]);
  });

  it("still answers when the lastActiveAt stamp fails", async () => {
    respond([{ ...friend, pk: "USER#u1" }]);
    send.mockImplementationOnce(async () => ({
      Item: { ...friend, pk: "USER#u1" },
    }));
    send.mockImplementationOnce(async () => {
      throw new Error("throttled");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handler(
      event("GET /admin/users", { query: { me: "true" } }),
    );
    expect(res.statusCode).toBe(200);
  });

  it("dismisses What's New for anyone", async () => {
    respond([friend]);
    expect(parse(await handler(event("POST /admin/changelog-seen")))).toEqual({
      status: 200,
      body: { success: true },
    });
    expect(sent()).toEqual([
      {
        name: "UpdateCommand",
        input: {
          TableName: "Users",
          Key: { pk: "USER#u1" },
          UpdateExpression: "SET lastSeenChangelogAt = :now",
          ExpressionAttributeValues: { ":now": expect.any(String) },
        },
      },
    ]);
  });
});
