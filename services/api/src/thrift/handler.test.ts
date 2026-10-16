import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiEvent,
  parseResponse,
  sentCommands,
  type CommandLike,
} from "../shared/testing";

const { send } = vi.hoisted(() => ({
  send: vi.fn<(cmd: CommandLike) => Promise<unknown>>(),
}));
vi.mock("../shared/db", () => ({ db: { send } }));

process.env.TABLE_NAME = "Thrift";
process.env.USERS_TABLE = "Users";
const { handler } = await import("./handler");
const { clearCache } = await import("../shared/cache");
const { clearToken } = await import("./ebay");

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal("fetch", fetchMock);

const item = (
  id: string,
  title: string,
  price: number,
  extra: Record<string, unknown> = {},
) => ({
  itemId: id,
  title,
  price: { value: String(price), currency: "USD" },
  itemWebUrl: `https://www.ebay.com/itm/${id}`,
  condition: "Pre-owned",
  ...extra,
});

const FIXED = {
  total: 4,
  itemSummaries: [
    item("1", "Patagonia Synchilla Snap-T fleece M", 45),
    item("2", "Patagonia Synchilla Snap-T pullover medium", 52),
    item("3", "Patagonia kids Synchilla Snap-T youth XL", 24),
    item("4", "Lot of 3 Patagonia fleeces", 90),
    { itemId: "5", title: "No price" },
  ],
};
const AUCTIONS = {
  itemSummaries: [
    item("9", "Vintage Patagonia Synchilla Snap-T M", 0.99, {
      currentBidPrice: { value: "31.00", currency: "USD" },
      bidCount: 6,
      itemEndDate: "2026-10-16T20:00:00.000Z",
    }),
  ],
};

function profile(
  permissions: Record<string, boolean>,
  { calibration = [] as { ratio: number }[], overLimit = false } = {},
) {
  send.mockImplementation(async (cmd: CommandLike) => {
    const name = cmd.constructor.name;
    if (name === "GetCommand") return { Item: { role: "USER", permissions } };
    if (name === "QueryCommand") return { Items: calibration };
    if (name === "UpdateCommand" && cmd.input.TableName === "Thrift") {
      if (overLimit) {
        throw Object.assign(new Error("limit"), {
          name: "ConditionalCheckFailedException",
        });
      }
    }
    return {};
  });
}

function ebay() {
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("/oauth2/token")) {
      return Response.json({ access_token: "tok", expires_in: 7200 });
    }
    return Response.json(url.includes("AUCTION") ? AUCTIONS : FIXED);
  });
}

const lookup = (body: unknown) =>
  handler(apiEvent("POST /thrift/lookup", { body }));

beforeEach(() => {
  send.mockReset();
  fetchMock.mockReset();
  clearCache();
  clearToken();
  process.env.EBAY_CLIENT_ID = "id";
  process.env.EBAY_CLIENT_SECRET = "secret";
});

describe("thrift lookup", () => {
  it("needs the thrift permission", async () => {
    profile({ hockey: true });
    expect(parseResponse(await lookup({}))).toEqual({
      status: 403,
      body: { error: "Thrift access required" },
    });
  });

  it("says eBay isn't connected when the keys are missing", async () => {
    profile({ thrift: true });
    delete process.env.EBAY_CLIENT_ID;
    const res = parseResponse(
      await lookup({ brand: "Patagonia", itemType: "Sweater or fleece" }),
    );
    expect(res).toEqual({
      status: 503,
      body: { error: "eBay isn't connected to LifeHub yet." },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a lookup without a brand", async () => {
    profile({ thrift: true });
    const res = parseResponse(
      await lookup({ brand: " ", itemType: "Sweater or fleece" }),
    );
    expect(res).toEqual({ status: 400, body: { error: "Add the brand" } });
  });

  it("returns listings, flags likely mismatches, and adds the calibration", async () => {
    profile(
      { thrift: true },
      { calibration: [{ ratio: 0.7 }, { ratio: 0.8 }] },
    );
    ebay();
    const res = parseResponse(
      await lookup({
        brand: "Patagonia",
        itemType: "Sweater or fleece",
        detail: "Synchilla Snap-T",
      }),
    );

    expect(res.status).toBe(200);
    expect(res.body.query).toBe("patagonia synchilla snap-t");
    expect(res.body.calibration).toEqual({ ratio: 0.75, checks: 2 });

    const byId = Object.fromEntries(
      res.body.listings.map((l: { id: string }) => [l.id, l]),
    );
    expect(Object.keys(byId).sort()).toEqual(["1", "2", "3", "4", "9"]);
    expect(byId["9"]).toMatchObject({ kind: "auction", price: 31, bids: 6 });
    expect(byId["1"]).toMatchObject({ kind: "fixed", price: 45 });
    expect(byId["1"].suspect).toBeUndefined();
    expect(byId["3"].suspect).toBe("Looks like a kids' size");
    expect(byId["4"].suspect).toBe("Looks like a lot or bundle");

    const searches = fetchMock.mock.calls
      .map(([url]) => String(url))
      .filter((url) => url.includes("item_summary/search"));
    expect(searches).toHaveLength(2);
    expect(
      searches.every((u) => u.includes("q=patagonia+synchilla+snap-t")),
    ).toBe(true);
    const auth = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("item_summary"),
    )?.[1]?.headers as Record<string, string>;
    expect(auth.Authorization).toBe("Bearer tok");
    expect(auth["X-EBAY-C-MARKETPLACE-ID"]).toBe("EBAY_US");
  });

  it("counts each lookup against the caller's day", async () => {
    profile({ thrift: true });
    ebay();
    await lookup({ brand: "Levi's", itemType: "Jeans or pants" });
    const counter = sentCommands(send).find(
      (c) => c.name === "UpdateCommand" && c.input.TableName === "Thrift",
    );
    expect(counter?.input.Key).toMatchObject({ pk: "LIMIT#u1" });
  });

  it("stops at the daily limit without calling eBay", async () => {
    profile({ thrift: true }, { overLimit: true });
    ebay();
    const res = parseResponse(
      await lookup({ brand: "Levi's", itemType: "Jeans or pants" }),
    );
    expect(res.status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("thrift sales", () => {
  it("saves what Terapeak showed as a ratio to the asking price", async () => {
    profile({ thrift: true });
    const res = parseResponse(
      await handler(
        apiEvent("POST /thrift/sales", {
          body: {
            itemType: "Jeans or pants",
            query: "levi's 501",
            ceiling: 40,
            sold: 30,
          },
        }),
      ),
    );
    expect(res.status).toBe(201);
    const put = sentCommands(send).find((c) => c.name === "PutCommand");
    expect(put?.input.Item).toMatchObject({
      pk: "CAL#Jeans or pants",
      ceiling: 40,
      sold: 30,
      ratio: 0.75,
    });
  });

  it("rejects a sale with no sold price", async () => {
    profile({ thrift: true });
    const res = parseResponse(
      await handler(
        apiEvent("POST /thrift/sales", {
          body: { itemType: "Bag", query: "coach", ceiling: 40, sold: 0 },
        }),
      ),
    );
    expect(res).toEqual({
      status: 400,
      body: { error: "Type what they sold for" },
    });
  });
});
