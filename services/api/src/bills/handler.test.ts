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

process.env.TABLE_NAME = "Bills";
process.env.USERS_TABLE = "Users";
const { handler } = await import("./handler");

const rent = { name: " Rent ", amount: 1450, dueDayOfMonth: 1 };

const sent = () => sentCommands(send);
const usageStamps = () =>
  sent().filter(
    (c) => c.name === "UpdateCommand" && c.input.TableName === "Users",
  );
const billCommands = () => sent().filter((c) => c.input.TableName === "Bills");

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue({});
});

describe("bills handler", () => {
  it("lists the caller's bills with pk hidden and ids filled in", async () => {
    send.mockImplementation(async (cmd) =>
      cmd.constructor.name === "QueryCommand"
        ? {
            Items: [
              { pk: "USER#u1#BILL", sk: "a", name: "Rent" },
              { pk: "USER#u1#BILL", id: "old" },
            ],
          }
        : {},
    );
    expect(parse(await handler(event("GET /bills")))).toEqual({
      status: 200,
      body: [
        { pk: "BILL", sk: "a", id: "a", billId: "a", name: "Rent" },
        { pk: "BILL", id: "old", billId: "old" },
      ],
    });
    expect(billCommands()).toEqual([
      {
        name: "QueryCommand",
        input: {
          TableName: "Bills",
          KeyConditionExpression: "pk = :pk",
          ExpressionAttributeValues: { ":pk": "USER#u1#BILL" },
        },
      },
    ]);
  });

  it("never reads the profile (Bills only has write access to it)", async () => {
    await handler(event("GET /bills"));
    expect(sent().some((c) => c.name === "GetCommand")).toBe(false);
  });

  it("stamps lastUsedBills, except on the Hub's summary peek", async () => {
    await handler(event("GET /bills"));
    expect(usageStamps()).toHaveLength(1);
    expect(usageStamps()[0]?.input).toMatchObject({
      Key: { pk: "USER#u1" },
      ExpressionAttributeValues: { ":now": expect.any(String) },
    });
    expect(
      Object.values(usageStamps()[0]?.input.ExpressionAttributeNames ?? {}),
    ).toEqual(["lastUsedBills"]);

    send.mockClear();
    await handler(event("GET /bills", { query: { summary: "1" } }));
    expect(usageStamps()).toHaveLength(0);

    send.mockClear();
    await handler(
      event("DELETE /bills", { query: { billId: "a", summary: "1" } }),
    );
    expect(usageStamps()).toHaveLength(1);
  });

  it("creates a bill with 201 and returns it with pk hidden", async () => {
    const res = parse(
      await handler(event("POST /bills", { body: { ...rent, billId: "b1" } })),
    );
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      name: "Rent",
      amount: 1450,
      dueDayOfMonth: 1,
      pk: "BILL",
      sk: "b1",
      id: "b1",
      billId: "b1",
      updatedAt: expect.any(String),
    });
    const put = billCommands()[0];
    expect(put?.name).toBe("PutCommand");
    expect(put?.input.Item).toEqual({ ...res.body, pk: "USER#u1#BILL" });
  });

  it("gives a new bill a random id", async () => {
    const res = parse(await handler(event("POST /bills", { body: rent })));
    expect(res.body.sk).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.id).toBe(res.body.sk);
  });

  it("replaces with 200 on PUT, preferring the path id", async () => {
    const res = parse(
      await handler(
        event("PUT /bills/{id}", {
          body: { ...rent, sk: "body" },
          pathParameters: { id: "path" },
        }),
      ),
    );
    expect(res.status).toBe(200);
    expect(res.body.sk).toBe("path");
  });

  it("explains a bad bill without saving it", async () => {
    expect(
      parse(
        await handler(event("POST /bills", { body: { ...rent, amount: -1 } })),
      ),
    ).toEqual({
      status: 400,
      body: { error: "The amount has to be a number of dollars, 0 or more." },
    });
    expect(
      parse(await handler(event("POST /bills", { body: "{nope" }))),
    ).toEqual({
      status: 400,
      body: { error: "Send the bill as JSON." },
    });
    expect(parse(await handler(event("PUT /bills")))).toEqual({
      status: 400,
      body: { error: "Send the bill as JSON." },
    });
    expect(billCommands()).toEqual([]);
  });

  it("deletes by ?billId= (what the screen sends)", async () => {
    expect(
      parse(
        await handler(event("DELETE /bills", { query: { billId: "a b" } })),
      ),
    ).toEqual({
      status: 200,
      body: { message: "Bill deleted", id: "a b" },
    });
    expect(billCommands()).toEqual([
      {
        name: "DeleteCommand",
        input: { TableName: "Bills", Key: { pk: "USER#u1#BILL", sk: "a b" } },
      },
    ]);
  });

  it("finds the id in ?id=, the path or the body", async () => {
    const id = async (opts: Parameters<typeof event>[1]) =>
      parse(await handler(event("DELETE /bills", opts))).body.id;
    expect(await id({ query: { id: "q" } })).toBe("q");
    expect(await id({ pathParameters: { id: "p" } })).toBe("p");
    expect(await id({ body: { sk: "s" } })).toBe("s");
    expect(await id({ body: { billId: "b", sk: "s" } })).toBe("b");
  });

  it("asks which bill when the id is missing", async () => {
    for (const opts of [
      {},
      { query: { billId: "undefined" } },
      { body: "{bad" },
      { body: { id: "null" } },
    ]) {
      expect(parse(await handler(event("DELETE /bills", opts)))).toEqual({
        status: 400,
        body: { error: "Which bill? The id is missing." },
      });
    }
  });

  it("hides DynamoDB errors behind a friendly message", async () => {
    send.mockImplementation(async (cmd) => {
      if (cmd.constructor.name === "QueryCommand") throw new Error("boom");
      return {};
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(parse(await handler(event("GET /bills")))).toEqual({
      status: 500,
      body: { error: "Something went wrong saving your bills. Try again." },
    });
  });
});
