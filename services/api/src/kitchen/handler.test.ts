import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  event,
  fakeDb,
  put,
  table,
  type CommandLike,
  type Stored,
} from "./test/fakeTable";

const { send } = vi.hoisted(() => ({
  send: vi.fn<(cmd: CommandLike) => Promise<unknown>>(),
}));
vi.mock("../shared/db", () => ({ db: { send } }));

process.env.TABLE_NAME = "Kitchen";
process.env.USERS_TABLE = "Users";
const { handler } = await import("./handler");

const parse = (res: Awaited<ReturnType<typeof handler>>) => ({
  status: res.statusCode,
  body: JSON.parse(res.body ?? "null"),
});
const post = async (body: unknown) =>
  parse(await handler(event("POST /kitchen", body)));
const stored = (type: string) =>
  table.filter((i) => i.pk === `USER#u1#${type}`);

beforeEach(() => {
  table.length = 0;
  send.mockReset();
  send.mockImplementation(async (cmd) => fakeDb(cmd));
});

describe("kitchen handler", () => {
  it("lists every kind of item with a short pk", async () => {
    put({ pk: "USER#u1#GROCERY", sk: "g", name: "Milk" });
    put({ pk: "USER#u1#INVENTORY", sk: "p", name: "Rice" });
    put({ pk: "USER#u1#QUICKMEAL", sk: "m", name: "Breakfast", items: [] });
    put({ pk: "USER#u2#GROCERY", sk: "x", name: "Not mine" });
    const res = parse(await handler(event("GET /kitchen")));
    expect(res.status).toBe(200);
    expect(res.body.map((i: Stored) => [i.pk, i.sk])).toEqual([
      ["GROCERY", "g"],
      ["INVENTORY", "p"],
      ["QUICKMEAL", "m"],
    ]);
  });

  it("adds to a list item with the same name but not a look-alike", async () => {
    put({
      pk: "USER#u1#GROCERY",
      sk: "g",
      name: "Olive oil",
      quantity: 1,
      unit: "",
    });
    await post({ pk: "GROCERY", name: "oil", quantity: 1, unit: "" });
    const again = await post({ pk: "GROCERY", name: "Oils", quantity: 2 });
    expect(again.body).toMatchObject({
      pk: "GROCERY",
      name: "oil",
      quantity: 3,
    });
    expect(stored("GROCERY")).toHaveLength(2);
  });

  it("treats items with no pk as list items, like older app versions sent", async () => {
    const res = await post({ name: "Bananas", quantity: 6, unit: "item" });
    expect(res.body).toMatchObject({
      pk: "GROCERY",
      name: "Bananas",
      quantity: 6,
    });
  });

  it("replaces an item exactly when it has an sk", async () => {
    put({
      pk: "USER#u1#INVENTORY",
      sk: "p",
      name: "Rice",
      currentQuantity: 3,
      unit: "lb",
    });
    await post({
      pk: "INVENTORY",
      sk: "p",
      name: "Rice",
      currentQuantity: 1,
      unit: "lb",
      location: "shelf",
      lowAt: 1,
    });
    expect(stored("INVENTORY")).toEqual([
      {
        pk: "USER#u1#INVENTORY",
        sk: "p",
        name: "Rice",
        currentQuantity: 1,
        unit: "lb",
        location: "shelf",
        lowAt: 1,
      },
    ]);
  });

  it("says what's wrong with a bad item", async () => {
    expect(await post({ pk: "GROCERY", name: " " })).toEqual({
      status: 400,
      body: { error: "Give it a name." },
    });
    expect(await post({ pk: "QUICKMEAL", name: "Toast", items: [] })).toEqual({
      status: 400,
      body: { error: "Add at least one item." },
    });
  });

  it("puts list items away, merging every amount into the pantry", async () => {
    put({
      pk: "USER#u1#GROCERY",
      sk: "g1",
      name: "Milk",
      quantity: 1,
      unit: "gal",
      extra: [{ quantity: 1, unit: "carton" }],
      inCart: true,
    });
    put({
      pk: "USER#u1#GROCERY",
      sk: "g2",
      name: "Eggs",
      quantity: 12,
      unit: "",
      inCart: true,
    });
    put({
      pk: "USER#u1#INVENTORY",
      sk: "p1",
      name: "milk",
      currentQuantity: 2,
      unit: "qt",
    });
    const res = await post({ action: "PUT_AWAY", sks: ["g1", "g2"] });
    expect(res.status).toBe(200);
    expect(res.body.removed).toEqual(["g1", "g2"]);
    expect(res.body.pantryItems).toEqual([
      {
        pk: "INVENTORY",
        sk: "p1",
        name: "milk",
        currentQuantity: 6,
        unit: "qt",
        extra: [{ quantity: 1, unit: "carton" }],
      },
      {
        pk: "INVENTORY",
        sk: "g2",
        name: "Eggs",
        currentQuantity: 12,
        unit: "",
      },
    ]);
    expect(stored("GROCERY")).toEqual([]);
    expect(stored("INVENTORY")).toHaveLength(2);
  });

  it("still handles the older one-at-a-time purchase", async () => {
    put({
      pk: "USER#u1#GROCERY",
      sk: "g",
      name: "Rice",
      quantity: 2,
      unit: "lb",
    });
    const res = await post({ action: "PURCHASE_GROCERY", item: { sk: "g" } });
    expect(res.body).toEqual({
      success: true,
      pantryItem: {
        pk: "INVENTORY",
        sk: "g",
        name: "Rice",
        currentQuantity: 2,
        unit: "lb",
      },
    });
  });

  it("logs a meal, skipping units that don't convert", async () => {
    put({
      pk: "USER#u1#INVENTORY",
      sk: "eggs",
      name: "Eggs",
      currentQuantity: 3,
      unit: "",
    });
    put({
      pk: "USER#u1#INVENTORY",
      sk: "bread",
      name: "Bread",
      currentQuantity: 1,
      unit: "loaf",
    });
    const res = await post({
      action: "LOG_QUICK_MEAL",
      items: [
        { pantrySk: "eggs", name: "Eggs", quantity: 4, unit: "" },
        { pantrySk: "bread", name: "Bread", quantity: 2, unit: "slices" },
        { pantrySk: null, name: "Hot sauce", quantity: 1, unit: "" },
        { pantrySk: "gone", name: "Sausage", quantity: 2, unit: "" },
      ],
    });
    expect(res.body).toEqual({
      success: true,
      pantryItems: [
        {
          pk: "INVENTORY",
          sk: "eggs",
          name: "Eggs",
          currentQuantity: 0,
          unit: "",
        },
      ],
      skipped: [
        { name: "Bread", reason: "units-differ" },
        { name: "Sausage", reason: "not-in-pantry" },
      ],
    });
    expect(
      stored("INVENTORY").find((i) => i.sk === "bread")?.currentQuantity,
    ).toBe(1);
  });

  it("restores items for Undo", async () => {
    put({
      pk: "USER#u1#INVENTORY",
      sk: "p",
      name: "Eggs",
      currentQuantity: 0,
      unit: "",
    });
    put({
      pk: "USER#u1#INVENTORY",
      sk: "new",
      name: "Rice",
      currentQuantity: 1,
      unit: "",
    });
    await post({
      action: "RESTORE",
      put: [
        {
          pk: "INVENTORY",
          sk: "p",
          name: "Eggs",
          currentQuantity: 3,
          unit: "",
        },
        { pk: "GROCERY", sk: "g", name: "Rice", quantity: 1, unit: "" },
      ],
      remove: [{ pk: "INVENTORY", sk: "new" }],
    });
    expect(stored("INVENTORY")).toEqual([
      {
        pk: "USER#u1#INVENTORY",
        sk: "p",
        name: "Eggs",
        currentQuantity: 3,
        unit: "",
      },
    ]);
    expect(stored("GROCERY")).toHaveLength(1);
  });

  it("deletes by type, accepting the older stored-key form", async () => {
    put({ pk: "USER#u1#QUICKMEAL", sk: "m", name: "Breakfast" });
    put({ pk: "USER#u1#GROCERY", sk: "g", name: "Milk" });
    await handler(
      event(
        "DELETE /kitchen/{id}",
        undefined,
        { id: "m" },
        { pk: "USER#u1#QUICKMEAL" },
      ),
    );
    await handler(event("DELETE /kitchen/{id}", undefined, { id: "g" }));
    expect(table).toEqual([]);
  });

  it("records that Kitchen was used", async () => {
    await handler(event("GET /kitchen"));
    const update = send.mock.calls.find(
      ([c]) => c.constructor.name === "UpdateCommand",
    );
    expect(update?.[0].input.ExpressionAttributeNames).toEqual({
      "#attr": "lastUsedKitchen",
    });
  });
});
