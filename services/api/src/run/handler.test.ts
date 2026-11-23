import { marshall } from "@aws-sdk/util-dynamodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiEvent,
  parseResponse,
  sentCommands,
  type CommandLike,
} from "../shared/testing";

const { send, key } = vi.hoisted(() => ({
  send: vi.fn<(cmd: CommandLike) => Promise<unknown>>(),
  key: vi.fn<() => Promise<string | undefined>>(),
}));
vi.mock("../shared/db", () => ({ db: { send } }));
vi.mock("./garmin/app", () => ({
  getGarminKey: key,
  forgetGarminKey: vi.fn(),
}));

process.env.TABLE_NAME = "Run";
process.env.USERS_TABLE = "Users";
const { handler } = await import("./handler");
const { clearToken } = await import("./garmin/http");

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal("fetch", fetchMock);

const jwt = (exp: number) =>
  `h.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.s`;

type Setup = {
  role?: "ADMIN" | "USER";
  owner?: {
    userId: string;
    connectedAt: string;
    syncedAt?: string;
    syncVersion?: number;
  };
  runs?: unknown[];
  details?: unknown[];
};

/** DynamoDB with the caller's profile, the key's owner and stored runs. */
function table({
  role = "USER",
  owner: initialOwner,
  runs = [],
  details = [],
}: Setup = {}) {
  let owner = initialOwner;
  send.mockImplementation(async (cmd: CommandLike) => {
    const name = cmd.constructor.name;
    // Like DynamoDB, refuse items with undefined fields.
    if (name === "PutCommand") marshall(cmd.input.Item);
    if (name === "BatchWriteCommand")
      for (const writes of Object.values(
        cmd.input.RequestItems as Record<
          string,
          { PutRequest?: { Item: object } }[]
        >,
      ))
        for (const w of writes) if (w.PutRequest) marshall(w.PutRequest.Item);
    if (name === "DeleteCommand") owner = undefined;
    if (name === "GetCommand" && cmd.input.TableName === "Users") {
      return { Item: { role, permissions: { run: true } } };
    }
    if (name === "GetCommand")
      return { Item: owner && { pk: "CONFIG", ...owner } };
    if (name === "QueryCommand") {
      const pk = (
        cmd.input.ExpressionAttributeValues as Record<string, string>
      )[":pk"];
      if (pk?.endsWith("#RUN")) return { Items: runs };
      if (pk?.endsWith("#DETAIL")) return { Items: details };
      return { Items: [] };
    }
    return {};
  });
}

const garminActivity = {
  activityId: 21034,
  activityName: "Recovery jog",
  startTimeLocal: "2026-11-23 07:02:00",
  activityType: { typeKey: "running" },
  distance: 9978.3,
  duration: 3584.2,
  averageHR: 138,
  elevationGain: 34.1,
};

/** Garmin's token endpoint, activity search and VO2 max history. */
function garmin(activities: unknown[] = [garminActivity]) {
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("/personal-api-key/token")) {
      return new Response(jwt(Date.now() / 1000 + 86400));
    }
    if (url.includes("/activities/search/")) return Response.json(activities);
    if (url.includes("/maxmet/daily/")) {
      return Response.json([
        { generic: { calendarDate: "2026-11-22", vo2MaxPreciseValue: 51.4 } },
      ]);
    }
    return new Response(null, { status: 404 });
  });
}

const batchPuts = () =>
  sentCommands(send)
    .filter((c) => c.name === "BatchWriteCommand")
    .flatMap((c) =>
      Object.values(c.input.RequestItems as Record<string, unknown[]>).flat(),
    )
    .map(
      (r) =>
        (r as { PutRequest?: { Item: Record<string, unknown> } }).PutRequest
          ?.Item,
    );

beforeEach(() => {
  send.mockReset();
  key.mockReset();
  fetchMock.mockReset();
  clearToken();
});

describe("GET /run", () => {
  it("needs the run permission", async () => {
    send.mockResolvedValue({
      Item: { role: "USER", permissions: { hockey: true } },
    });
    const res = parseResponse(await handler(apiEvent("GET /run")));
    expect(res).toEqual({
      status: 403,
      body: { error: "Run access required" },
    });
  });

  it("shows example runs while the Garmin key isn't set up", async () => {
    table({ role: "ADMIN" });
    key.mockResolvedValue(undefined);
    const res = parseResponse(await handler(apiEvent("GET /run")));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      source: "example",
      garmin: "unavailable",
    });
    expect(res.body.activities.length).toBeGreaterThan(80);
    expect(res.body.lifts.length).toBeGreaterThan(150);
    expect(res.body.lifts[0].sets.length).toBeGreaterThan(10);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lets an admin connect an unclaimed key, but not anyone else", async () => {
    key.mockResolvedValue("personal-key");
    table({ role: "ADMIN" });
    let res = parseResponse(await handler(apiEvent("GET /run")));
    expect(res.body.garmin).toBe("available");
    table({ role: "USER" });
    res = parseResponse(await handler(apiEvent("GET /run")));
    expect(res.body.garmin).toBe("unavailable");
  });

  it("never shows the owner's runs to someone else", async () => {
    key.mockResolvedValue("personal-key");
    table({ role: "ADMIN", owner: { userId: "someone", connectedAt: "x" } });
    const res = parseResponse(await handler(apiEvent("GET /run")));
    expect(res.body).toMatchObject({
      source: "example",
      garmin: "unavailable",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("serves the owner's stored runs without calling Garmin when fresh", async () => {
    key.mockResolvedValue("personal-key");
    const syncedAt = new Date(Date.now() - 60_000).toISOString();
    table({
      owner: { userId: "u1", connectedAt: "x", syncedAt, syncVersion: 2 },
      runs: [
        {
          pk: "USER#u1#RUN",
          sk: "s",
          id: "1",
          start: "2026-11-23T07:02:00",
          name: "Easy",
          distanceM: 5000,
          durationS: 1500,
        },
      ],
      details: [{ pk: "USER#u1#DETAIL", sk: "1", id: "1", found: false }],
    });
    const res = parseResponse(await handler(apiEvent("GET /run")));
    expect(res.body).toMatchObject({
      source: "garmin",
      garmin: "connected",
      syncedAt,
    });
    expect(res.body.activities).toEqual([
      {
        id: "1",
        start: "2026-11-23T07:02:00",
        name: "Easy",
        distanceM: 5000,
        durationS: 1500,
      },
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("copies new runs from Garmin on Refresh, sending the key only to the token endpoint", async () => {
    key.mockResolvedValue("personal-key");
    garmin([
      garminActivity,
      {
        ...garminActivity,
        activityId: 9,
        activityType: { typeKey: "strength_training" },
      },
    ]);
    table({
      owner: {
        userId: "u1",
        connectedAt: "x",
        syncedAt: new Date().toISOString(),
      },
    });

    const res = parseResponse(
      await handler(apiEvent("GET /run", { query: { refresh: "1" } })),
    );
    expect(res.status).toBe(200);

    const [tokenCall, ...dataCalls] = fetchMock.mock.calls;
    expect(String(tokenCall?.[0])).toBe(
      "https://personal.connectapi.garmin.com/personalapitoken-service/personal-api/personal-api-key/token",
    );
    expect(tokenCall?.[1]?.headers).toMatchObject({
      Authorization: "ApiKey personal-key",
    });
    for (const [, init] of dataCalls) {
      expect(JSON.stringify(init?.headers)).not.toContain("personal-key");
    }
    expect(String(dataCalls[0]?.[0])).toContain("/activities/search/");

    expect(batchPuts()).toContainEqual({
      pk: "USER#u1#RUN",
      sk: "2026-11-23T07:02:00#21034",
      id: "21034",
      start: "2026-11-23T07:02:00",
      name: "Recovery jog",
      distanceM: 9978,
      durationS: 3584,
      avgHr: 138,
      elevGainM: 34,
    });
    expect(batchPuts()).toContainEqual({
      pk: "USER#u1#VO2",
      sk: "2026-11-22",
      date: "2026-11-22",
      value: 51,
    });
    expect(batchPuts().filter((i) => i?.pk === "USER#u1#RUN")).toHaveLength(1);
    expect(batchPuts()).toContainEqual(
      expect.objectContaining({ pk: "USER#u1#LIFT", id: "9" }),
    );
  });
});

describe("when Garmin misbehaves", () => {
  const recentOwner = (syncVersion?: number) => ({
    userId: "u1",
    connectedAt: "x",
    syncedAt: new Date(Date.now() - 20 * 60_000).toISOString(),
    syncVersion,
  });

  it("still loads when HRV comes back as an empty body", async () => {
    key.mockResolvedValue("personal-key");
    garmin();
    const ok = fetchMock.getMockImplementation();
    fetchMock.mockImplementation(async (input, init) =>
      String(input).includes("/hrv-service/")
        ? new Response("", { status: 200 })
        : (ok?.(input, init) ?? new Response(null, { status: 500 })),
    );
    table({ owner: recentOwner(2) });
    const res = parseResponse(await handler(apiEvent("GET /run")));
    expect(res.status).toBe(200);
    expect(res.body.syncError).toBeUndefined();
  });

  it("shows what was copied before, with the reason, when the copy fails", async () => {
    key.mockResolvedValue("personal-key");
    garmin();
    const ok = fetchMock.getMockImplementation();
    fetchMock.mockImplementation(async (input, init) =>
      String(input).includes("/activities/search/")
        ? new Response(null, { status: 503 })
        : (ok?.(input, init) ?? new Response(null, { status: 500 })),
    );
    const owner = recentOwner(2);
    table({ owner });
    const res = parseResponse(await handler(apiEvent("GET /run")));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      source: "garmin",
      syncedAt: owner.syncedAt,
      syncError:
        "Garmin /activitylist-service/activities/search/activities → HTTP 503",
    });
    expect(
      sentCommands(send).some((c) =>
        String(c.input.UpdateExpression).includes("syncedAt"),
      ),
    ).toBe(false);
  });

  it("copies the whole history once after a sync from before lifts and HRV", async () => {
    key.mockResolvedValue("personal-key");
    garmin();
    table({ owner: recentOwner(undefined) });
    await handler(apiEvent("GET /run"));
    const search = fetchMock.mock.calls
      .map(([input]) => String(input))
      .find((url) => url.includes("/activities/search/"));
    expect(search).toContain(
      `startDate=${new Date().getUTCFullYear() - 1}-01-01`,
    );
    const mark = sentCommands(send).find((c) =>
      String(c.input.UpdateExpression).includes("syncedAt"),
    );
    expect(mark?.input.ExpressionAttributeValues).toMatchObject({ ":v": 2 });
  });

  it("says which step failed when loading breaks", async () => {
    key.mockResolvedValue("personal-key");
    garmin();
    table({ owner: recentOwner(2) });
    const ok = send.getMockImplementation();
    send.mockImplementation(async (cmd) => {
      if (cmd.constructor.name === "QueryCommand") {
        const error = new Error("boom");
        error.name = "ProvisionedThroughputExceededException";
        throw error;
      }
      return ok?.(cmd);
    });
    const res = parseResponse(await handler(apiEvent("GET /run")));
    expect(res).toEqual({
      status: 500,
      body: {
        error:
          "Couldn't load your training from Garmin while reading saved activities (ProvisionedThroughputExceededException)",
      },
    });
  });

  it("writes a key named twice in one batch only once", async () => {
    key.mockResolvedValue("personal-key");
    garmin([garminActivity, garminActivity]);
    table({ owner: recentOwner(2) });
    await handler(apiEvent("GET /run"));
    const batches = sentCommands(send)
      .filter((c) => c.name === "BatchWriteCommand")
      .map(
        (c) => Object.values(c.input.RequestItems as object)[0] as unknown[],
      );
    expect(
      batches.flat().filter((w) => JSON.stringify(w).includes("#RUN")),
    ).toHaveLength(1);
  });
});

describe("a replaced key", () => {
  it("reads the key again when Garmin rejects the old one", async () => {
    key
      .mockResolvedValueOnce("old-key")
      .mockResolvedValueOnce("old-key")
      .mockResolvedValue("new-key");
    garmin();
    const ok = fetchMock.getMockImplementation();
    fetchMock.mockImplementation(async (input, init) =>
      JSON.stringify(init?.headers).includes("old-key")
        ? new Response(null, { status: 401 })
        : (ok?.(input, init) ?? new Response(null, { status: 500 })),
    );
    table({ owner: { userId: "u1", connectedAt: "x" } });
    const res = parseResponse(await handler(apiEvent("GET /run")));
    expect(res.status).toBe(200);
    expect(res.body.source).toBe("garmin");
  });
});

describe("connecting and disconnecting", () => {
  it("claims the key for an admin and copies their history", async () => {
    key.mockResolvedValue("personal-key");
    garmin();
    table({ role: "ADMIN" });
    const res = parseResponse(await handler(apiEvent("POST /run/garmin")));
    expect(res.status).toBe(200);
    const claim = sentCommands(send).find((c) => c.name === "PutCommand");
    expect(claim?.input).toMatchObject({
      Item: { pk: "CONFIG", sk: "GARMIN", userId: "u1" },
      ConditionExpression: "attribute_not_exists(pk) OR userId = :me",
    });
  });

  it("won't let a non-admin claim the key", async () => {
    key.mockResolvedValue("personal-key");
    table({ role: "USER" });
    const res = parseResponse(await handler(apiEvent("POST /run/garmin")));
    expect(res).toEqual({
      status: 403,
      body: { error: "Only an admin can connect Garmin" },
    });
  });

  it("deletes the owner's copied runs on disconnect", async () => {
    key.mockResolvedValue("personal-key");
    table({ role: "ADMIN", owner: { userId: "u1", connectedAt: "x" } });
    const res = parseResponse(await handler(apiEvent("DELETE /run/garmin")));
    expect(res.status).toBe(200);
    expect(
      sentCommands(send).some(
        (c) =>
          c.name === "DeleteCommand" &&
          (c.input.Key as { pk: string }).pk === "CONFIG",
      ),
    ).toBe(true);
  });
});
