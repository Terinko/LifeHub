import { beforeEach, describe, expect, it, vi } from "vitest";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const { send } = vi.hoisted(() => ({
  send: vi.fn<(cmd: CommandLike) => Promise<unknown>>(),
}));
vi.mock("../shared/db", () => ({ db: { send } }));

process.env.TABLE_NAME = "Applications";
process.env.USERS_TABLE = "Users";
const { handler } = await import("./handler");

type CommandLike = {
  constructor: { name: string };
  input: Record<string, unknown>;
};

function event(
  routeKey: string,
  body?: unknown,
  pathParameters?: Record<string, string>,
): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    routeKey,
    body: body === undefined ? undefined : JSON.stringify(body),
    pathParameters,
    requestContext: { authorizer: { jwt: { claims: { sub: "u1" } } } },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

function respondAs(role: string, items: unknown[] = []) {
  send.mockImplementation(async (cmd: CommandLike) => {
    if (cmd.constructor.name === "GetCommand") return { Item: { role } };
    if (cmd.constructor.name === "QueryCommand") return { Items: items };
    return {};
  });
}

const parse = (res: Awaited<ReturnType<typeof handler>>) => ({
  status: res.statusCode,
  body: JSON.parse(res.body ?? "null"),
});

beforeEach(() => {
  send.mockReset();
});

describe("applications handler", () => {
  it("rejects non-admins", async () => {
    respondAs("USER");
    expect(parse(await handler(event("GET /applications")))).toEqual({
      status: 403,
      body: { error: "Admin only" },
    });
  });

  it("lists the caller's applications", async () => {
    respondAs("ADMIN", [{ sk: "a" }]);
    const res = parse(await handler(event("GET /applications")));
    expect(res).toEqual({ status: 200, body: [{ sk: "a" }] });
    const query = send.mock.calls[1]?.[0] as CommandLike;
    expect(query.input.ExpressionAttributeValues).toEqual({
      ":pk": "USER#u1#APPLICATION",
    });
  });

  it("validates status updates", async () => {
    respondAs("ADMIN");
    const res = parse(
      await handler(
        event("POST /applications", {
          action: "UPDATE_STATUS",
          sk: "a",
          status: "Nope",
        }),
      ),
    );
    expect(res).toEqual({
      status: 400,
      body: { error: "Invalid status update" },
    });
  });

  it("requires company and position when saving", async () => {
    respondAs("ADMIN");
    const res = parse(
      await handler(event("POST /applications", { company: "Acme" })),
    );
    expect(res).toEqual({
      status: 400,
      body: { error: "Company and position are required" },
    });
  });

  it("deletes by id", async () => {
    respondAs("ADMIN");
    const res = parse(
      await handler(
        event("DELETE /applications/{id}", undefined, { id: "a%201" }),
      ),
    );
    expect(res).toEqual({ status: 200, body: { message: "Deleted" } });
    const del = send.mock.calls[1]?.[0] as CommandLike;
    expect(del.input.Key).toEqual({ pk: "USER#u1#APPLICATION", sk: "a 1" });
  });

  it("returns 401 without a signed-in user", async () => {
    const res = await handler({
      routeKey: "GET /applications",
      requestContext: {},
    } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer);
    expect(res.statusCode).toBe(401);
  });
});
