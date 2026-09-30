import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./client";
import { API_BASE } from "../../config";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({
    tokens: { idToken: { toString: () => "test-token" } },
  })),
}));

function mockFetch(status: number, body: string) {
  const fn = vi.fn(async () => new Response(body, { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("api client", () => {
  it("sends the token and JSON body to the API base URL", async () => {
    const fetchMock = mockFetch(200, JSON.stringify({ ok: true }));

    const result = await api.post("/poker", { name: "Sam" });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/poker`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({ name: "Sam" }),
    });
  });

  it("throws ApiError with the server's error message", async () => {
    mockFetch(403, JSON.stringify({ error: "Poker access required" }));

    const err = await api.get("/poker").catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 403,
      message: "Poker access required",
    });
  });

  it("can send a body with DELETE", async () => {
    const fetchMock = mockFetch(200, "{}");

    await api.delete("/admin/users", { pk: "USER#1" });

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE}/admin/users`,
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ pk: "USER#1" }),
      }),
    );
  });

  it("returns null for an empty response", async () => {
    mockFetch(200, "");
    await expect(api.delete("/poker/1")).resolves.toBeNull();
  });
});
