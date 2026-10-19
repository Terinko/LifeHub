import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiEvent as event,
  parseResponse as parse,
  sentCommands,
  type CommandLike,
} from "../shared/testing";

// Handler-level tests for the admin-only /admin/users routes.

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

process.env.TABLE_NAME = "Users";
process.env.USER_POOL_ID = "pool";
const { handler } = await import("./handler");

const admin = { pk: "USER#u1", email: "me@x.com", role: "ADMIN" };
const friend = {
  pk: "USER#f1",
  email: "f@x.com",
  role: "USER",
  permissions: { poker: true },
};

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

const writes = () =>
  sentCommands(send).filter(
    (c) => !["GetCommand", "ScanCommand"].includes(c.name),
  );
const call = async (routeKey: string, body?: unknown) =>
  parse(await handler(event(routeKey, { body })));

beforeEach(() => {
  send.mockReset();
  cognitoSend.mockReset();
});

describe("admin only", () => {
  it("turns away everyone else, before reading the body", async () => {
    respond([{ ...friend, pk: "USER#u1" }]);
    for (const routeKey of [
      "GET /admin/users",
      "POST /admin/users",
      "PUT /admin/users",
      "DELETE /admin/users",
    ]) {
      expect(await call(routeKey, "{not json")).toEqual({
        status: 403,
        body: { error: "Admin only" },
      });
    }
    respond([]);
    expect((await call("GET /admin/users")).status).toBe(403);
    expect(writes()).toEqual([]);
    expect(cognitoSend).not.toHaveBeenCalled();
  });

  it("lists every user", async () => {
    respond([admin, friend]);
    expect(await call("GET /admin/users")).toEqual({
      status: 200,
      body: [admin, friend],
    });
  });
});

describe("inviting", () => {
  it("creates the Cognito login and a profile that starts caught up", async () => {
    respond([admin]);
    cognitoSend.mockResolvedValue({
      User: {
        Attributes: [
          { Name: "email", Value: "n@x.com" },
          { Name: "sub", Value: "new" },
        ],
      },
    });
    const res = await call("POST /admin/users", {
      email: "n@x.com",
      permissions: { bills: true },
    });
    expect(res).toEqual({
      status: 200,
      body: {
        pk: "USER#new",
        email: "n@x.com",
        role: "USER",
        permissions: { bills: true },
        createdAt: expect.any(String),
        lastSeenChangelogAt: expect.any(String),
      },
    });
    const create = cognitoSend.mock.calls[0]?.[0];
    expect(create?.constructor.name).toBe("AdminCreateUserCommand");
    expect(create?.input).toEqual({
      UserPoolId: "pool",
      Username: "n@x.com",
      UserAttributes: [
        { Name: "email", Value: "n@x.com" },
        { Name: "email_verified", Value: "true" },
      ],
      DesiredDeliveryMediums: ["EMAIL"],
    });
    expect(writes()).toEqual([
      { name: "PutCommand", input: { TableName: "Users", Item: res.body } },
    ]);
  });

  it("gives no tools when none were picked", async () => {
    respond([admin]);
    cognitoSend.mockResolvedValue({
      User: { Attributes: [{ Name: "sub", Value: "new" }] },
    });
    const res = await call("POST /admin/users", { email: "n@x.com" });
    expect(res.body.permissions).toEqual({
      bills: false,
      kitchen: false,
      poker: false,
      pokerStats: false,
      fantasy: false,
      weather: false,
      hockey: false,
    });
  });

  it("needs an email, and passes Cognito's errors through", async () => {
    respond([admin]);
    expect(await call("POST /admin/users", {})).toEqual({
      status: 400,
      body: { error: "Email required" },
    });
    cognitoSend.mockRejectedValue(new Error("User account already exists"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await call("POST /admin/users", { email: "f@x.com" })).toEqual({
      status: 500,
      body: { error: "User account already exists" },
    });
  });
});

describe("updating and removing", () => {
  it("replaces only the permissions", async () => {
    respond([admin, friend]);
    const res = await call("PUT /admin/users", {
      pk: "USER#f1",
      role: "ADMIN",
      permissions: { bills: true },
    });
    expect(res).toEqual({ status: 200, body: { message: "Updated" } });
    expect(writes()).toEqual([
      {
        name: "PutCommand",
        input: {
          TableName: "Users",
          Item: { ...friend, permissions: { bills: true } },
        },
      },
    ]);
  });

  it("404s an unknown user", async () => {
    respond([admin]);
    expect(
      await call("PUT /admin/users", { pk: "USER#x", permissions: {} }),
    ).toEqual({
      status: 404,
      body: { error: "User not found" },
    });
  });

  it("deletes the login, then the profile", async () => {
    respond([admin, friend]);
    cognitoSend.mockResolvedValue({});
    expect(
      await call("DELETE /admin/users", { pk: "USER#f1", email: "f@x.com" }),
    ).toEqual({
      status: 200,
      body: { message: "Deleted" },
    });
    const del = cognitoSend.mock.calls[0]?.[0];
    expect(del?.constructor.name).toBe("AdminDeleteUserCommand");
    expect(del?.input).toEqual({ UserPoolId: "pool", Username: "f@x.com" });
    expect(writes()).toEqual([
      {
        name: "DeleteCommand",
        input: { TableName: "Users", Key: { pk: "USER#f1" } },
      },
    ]);
  });

  it("won't let an admin delete themselves", async () => {
    respond([admin]);
    expect(
      await call("DELETE /admin/users", { pk: "USER#u1", email: "me@x.com" }),
    ).toEqual({
      status: 400,
      body: { error: "Cannot delete yourself" },
    });
    expect(cognitoSend).not.toHaveBeenCalled();
  });

  it("fails a bad body with a 500, as before", async () => {
    respond([admin]);
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await call("PUT /admin/users")).status).toBe(500);
    expect((await call("DELETE /admin/users", "{bad")).status).toBe(500);
  });
});
