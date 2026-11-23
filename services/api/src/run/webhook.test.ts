import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sentCommands, type CommandLike } from "../shared/testing";

const { send, app } = vi.hoisted(() => ({
  send: vi.fn<(cmd: CommandLike) => Promise<unknown>>(),
  app: vi.fn(),
}));
vi.mock("../shared/db", () => ({ db: { send } }));
vi.mock("./garmin/app", () => ({ getGarminApp: app }));

process.env.TABLE_NAME = "Run";
const { handler } = await import("./webhook");

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal("fetch", fetchMock);

const event = (body: unknown, clientId = "client-1") =>
  ({
    body: JSON.stringify(body),
    headers: { "garmin-client-id": clientId },
  }) as unknown as APIGatewayProxyEventV2;

const runSummary = {
  userId: "g1",
  summaryId: "s1",
  activityType: "RUNNING",
  activityName: "Recovery jog",
  startTimeInSeconds: Date.UTC(2026, 10, 23, 12, 2) / 1000,
  startTimeOffsetInSeconds: -5 * 3600,
  durationInSeconds: 3584,
  distanceInMeters: 9978.3,
  averageHeartRateInBeatsPerMinute: 138,
  totalElevationGainInMeters: 34,
};

beforeEach(() => {
  send.mockReset();
  fetchMock.mockReset();
  app.mockResolvedValue({ clientId: "client-1", clientSecret: "secret-1" });
  send.mockImplementation(async (cmd: CommandLike) => {
    const key = cmd.input.Key as { pk?: string; sk?: string } | undefined;
    if (cmd.constructor.name !== "GetCommand") return {};
    if (key?.pk === "GARMIN#g1") return { Item: { userId: "u1" } };
    if (key?.pk === "USER#u1" && key.sk === "GARMIN") {
      return {
        Item: { accessToken: "access", expiresAt: "2999-01-01T00:00:00Z" },
      };
    }
    return {};
  });
});

const putItems = () =>
  sentCommands(send)
    .filter((c) => c.name === "PutCommand")
    .map((c) => c.input.Item);

describe("Garmin webhook", () => {
  it("rejects requests that don't name LifeHub's Garmin app", async () => {
    const res = await handler(
      event({ activities: [runSummary] }, "someone-else"),
    );
    expect(res.statusCode).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });

  it("stores pushed runs in local time for the connected user", async () => {
    const res = await handler(event({ activities: [runSummary] }));
    expect(res.statusCode).toBe(200);
    expect(putItems()).toEqual([
      {
        pk: "USER#u1#RUN",
        sk: "2026-11-23T07:02:00#s1",
        id: "s1",
        start: "2026-11-23T07:02:00",
        name: "Recovery jog",
        distanceM: 9978,
        durationS: 3584,
        avgHr: 138,
        elevGainM: 34,
      },
    ]);
  });

  it("skips other activities and unknown Garmin users", async () => {
    await handler(
      event({
        activities: [
          { ...runSummary, activityType: "STRENGTH_TRAINING" },
          { ...runSummary, userId: "stranger" },
        ],
      }),
    );
    expect(putItems()).toEqual([]);
  });

  it("stores VO2 max readings", async () => {
    await handler(
      event({
        userMetrics: [
          { userId: "g1", calendarDate: "2026-11-22", vo2Max: 51.4 },
        ],
      }),
    );
    expect(putItems()).toEqual([
      { pk: "USER#u1#VO2", sk: "2026-11-22", date: "2026-11-22", value: 51 },
    ]);
  });

  it("fetches pinged summaries from Garmin only", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([runSummary])));
    await handler(
      event({
        activities: [
          {
            userId: "g1",
            callbackURL:
              "https://apis.garmin.com/wellness-api/rest/activities?token=x",
          },
          { userId: "g1", callbackURL: "https://evil.example/steal" },
        ],
      }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: "Bearer access",
    });
    expect(putItems()).toHaveLength(1);
  });
});
