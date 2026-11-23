// Garmin Personal API (https://personal.connectapi.garmin.com): the personal
// key is exchanged for a 24-hour bearer token, which reads the key owner's data.

const BASE = "https://personal.connectapi.garmin.com";
const TOKEN_PATH =
  "/personalapitoken-service/personal-api/personal-api-key/token";
const TIMEOUT_MS = 15_000;
// Get a new token when the current one has less than this left.
const EARLY_MS = 60 * 60_000;

/** Garmin answered with a non-2xx status. The message never includes a query string or a key. */
export class GarminError extends Error {
  readonly status: number;

  constructor(path: string, status: number) {
    super(`Garmin ${path} → HTTP ${status}`);
    this.name = "GarminError";
    this.status = status;
  }
}

/** The `exp` claim of a JWT, in milliseconds (the token isn't verified, only read). */
function jwtExpiry(token: string): number {
  const payload = token.split(".")[1] ?? "";
  const { exp } = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8"),
  ) as {
    exp?: number;
  };
  if (typeof exp !== "number") throw new Error("Garmin token has no expiry");
  return exp * 1000;
}

let token: { value: string; expiresAt: number; key: string } | undefined;

/** A bearer token for `apiKey`, reused across requests while it's fresh. */
export async function bearerToken(
  apiKey: string,
  now = Date.now(),
): Promise<string> {
  if (token && token.key === apiKey && token.expiresAt - EARLY_MS > now) {
    return token.value;
  }
  const res = await fetch(`${BASE}${TOKEN_PATH}`, {
    method: "POST",
    headers: { Accept: "*/*", Authorization: `ApiKey ${apiKey}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new GarminError(TOKEN_PATH, res.status);
  const value = (await res.text()).trim();
  token = { value, expiresAt: jwtExpiry(value), key: apiKey };
  return value;
}

/** Tests only: forget the cached token. */
export const clearToken = () => {
  token = undefined;
};

/** GETs JSON from the Personal API with a bearer token. */
export async function garminGet<T>(
  path: string,
  params: Record<string, string | number>,
  bearer: string,
): Promise<T> {
  const query = new URLSearchParams(
    Object.entries(params).map(([k, v]): [string, string] => [k, String(v)]),
  );
  const res = await fetch(`${BASE}${path}?${query}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${bearer}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new GarminError(path, res.status);
  return (await res.json()) as T;
}
