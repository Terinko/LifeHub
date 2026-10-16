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

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal("fetch", fetchMock);
vi.spyOn(console, "error").mockImplementation(() => {});

const sold = (
  id: string,
  title: string,
  price: number,
  extra: Record<string, unknown> = {},
) => ({
  id,
  title,
  size: "M",
  condition: "ug",
  picture_url: `https://img/${id}.jpg`,
  price_amount: { val: `${price}.0`, currency_code: "USD" },
  inventory: { status: "sold_out", status_changed_at: "2026-10-12T10:00:00" },
  ...extra,
});

// The search page carries its data in window.__INITIAL_STATE__; a "}" inside
// a title must not end it early.
const page = (listings: unknown[]) =>
  `<html><script>window.__INITIAL_STATE__=${JSON.stringify({
    nav: { links: [{ text: "Shop } All" }] },
    search: { results: { data: listings } },
  })};</script></html>`;

const LISTINGS = [
  sold("a1", "Patagonia Synchilla Snap-T fleece M", 45),
  sold("a2", "Patagonia Synchilla Snap-T pullover {medium}", 52, {
    condition: "nwt",
  }),
  sold("a2", "Patagonia Synchilla Snap-T pullover {medium}", 52),
  sold("a3", "Patagonia kids Synchilla Snap-T youth XL", 24),
  sold("a4", "Lot of 3 Patagonia fleeces", 90),
  sold("a5", "Patagonia Synchilla still for sale", 40, {
    inventory: { status: "available" },
  }),
];

function profile(permissions: Record<string, boolean>, overLimit = false) {
  send.mockImplementation(async (cmd: CommandLike) => {
    const name = cmd.constructor.name;
    if (name === "GetCommand") return { Item: { role: "USER", permissions } };
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

const lookup = (body: unknown) =>
  handler(apiEvent("POST /thrift/lookup", { body }));

beforeEach(() => {
  send.mockReset();
  fetchMock.mockReset();
  clearCache();
});

describe("thrift lookup", () => {
  it("needs the thrift permission", async () => {
    profile({ hockey: true });
    expect(parseResponse(await lookup({}))).toEqual({
      status: 403,
      body: { error: "Thrift access required" },
    });
  });

  it("rejects a lookup without a brand", async () => {
    profile({ thrift: true });
    const res = parseResponse(
      await lookup({ brand: " ", itemType: "Sweater or fleece" }),
    );
    expect(res).toEqual({ status: 400, body: { error: "Add the brand" } });
  });

  it("returns sold listings and flags likely mismatches", async () => {
    profile({ thrift: true });
    fetchMock.mockResolvedValue(new Response(page(LISTINGS)));
    const res = parseResponse(
      await lookup({
        brand: "Patagonia",
        itemType: "Sweater or fleece",
        detail: "Synchilla Snap-T",
      }),
    );

    expect(res.status).toBe(200);
    expect(res.body.query).toBe("patagonia synchilla snap-t");
    const byId = Object.fromEntries(
      res.body.listings.map((l: { id: string }) => [l.id, l]),
    );
    // Duplicates and unsold listings are dropped.
    expect(Object.keys(byId).sort()).toEqual(["a1", "a2", "a3", "a4"]);
    expect(byId["a1"]).toEqual({
      id: "a1",
      title: "Patagonia Synchilla Snap-T fleece M",
      price: 45,
      size: "M",
      condition: "Good",
      imageUrl: "https://img/a1.jpg",
      url: "https://poshmark.com/listing/a1",
      soldAt: "2026-10-12T10:00:00",
    });
    expect(byId["a2"].condition).toBe("New with tags");
    expect(byId["a3"].suspect).toBe("Looks like a kids' size");
    expect(byId["a4"].suspect).toBe("Looks like a lot or bundle");

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.origin + url.pathname).toBe("https://poshmark.com/search");
    expect(url.searchParams.get("query")).toBe("patagonia synchilla snap-t");
    expect(url.searchParams.get("availability")).toBe("sold_out");
  });

  it("says Poshmark is unavailable when the search is turned away", async () => {
    profile({ thrift: true });
    fetchMock.mockResolvedValue(new Response("blocked", { status: 403 }));
    const res = parseResponse(
      await lookup({ brand: "Levi's", itemType: "Jeans or pants" }),
    );
    expect(res).toEqual({
      status: 502,
      body: { error: "Couldn't get Poshmark sales right now." },
    });
  });

  it("says Poshmark is unavailable when the page has no listings data", async () => {
    profile({ thrift: true });
    fetchMock.mockResolvedValue(new Response("<html>Just a moment</html>"));
    const res = parseResponse(
      await lookup({ brand: "Levi's", itemType: "Jeans or pants" }),
    );
    expect(res.status).toBe(502);
  });

  it("counts each lookup against the caller's day", async () => {
    profile({ thrift: true });
    fetchMock.mockResolvedValue(new Response(page([])));
    await lookup({ brand: "Levi's", itemType: "Jeans or pants" });
    const counter = sentCommands(send).find(
      (c) => c.name === "UpdateCommand" && c.input.TableName === "Thrift",
    );
    expect(counter?.input.Key).toMatchObject({ pk: "LIMIT#u1" });
  });

  it("stops at the daily limit without calling Poshmark", async () => {
    profile({ thrift: true }, true);
    const res = parseResponse(
      await lookup({ brand: "Levi's", itemType: "Jeans or pants" }),
    );
    expect(res.status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
