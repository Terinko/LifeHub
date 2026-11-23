import { createHash, randomBytes } from "node:crypto";
import type { GarminApp } from "./app";
import { postForm } from "./http";

// Garmin Connect Developer Program sign-in: OAuth 2.0 with PKCE.
const AUTHORIZE_URL = "https://connect.garmin.com/oauth2Confirm";
const TOKEN_URL = "https://connectapi.garmin.com/di-oauth2-service/oauth/token";

// Refresh this long before Garmin says the access token expires.
const EARLY_MS = 10 * 60_000;

export type GarminTokens = {
  accessToken: string;
  refreshToken: string;
  /** ISO time to refresh the access token by. */
  expiresAt: string;
};

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

const base64url = (bytes: Buffer) => bytes.toString("base64url");

/** A fresh PKCE verifier, its S256 challenge, and a random state. */
export function newPkce() {
  const verifier = base64url(randomBytes(48));
  return {
    verifier,
    challenge: base64url(createHash("sha256").update(verifier).digest()),
    state: base64url(randomBytes(24)),
  };
}

/** Garmin's consent page for this user. */
export function authorizeUrl(
  app: GarminApp,
  pkce: { challenge: string; state: string },
  redirectUri: string,
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: app.clientId,
    code_challenge: pkce.challenge,
    code_challenge_method: "S256",
    redirect_uri: redirectUri,
    state: pkce.state,
  });
  return `${AUTHORIZE_URL}?${params}`;
}

const toTokens = (res: TokenResponse, now: Date): GarminTokens => ({
  accessToken: res.access_token,
  refreshToken: res.refresh_token,
  expiresAt: new Date(
    now.getTime() + res.expires_in * 1000 - EARLY_MS,
  ).toISOString(),
});

export async function exchangeCode(
  app: GarminApp,
  code: string,
  verifier: string,
  redirectUri: string,
  now = new Date(),
): Promise<GarminTokens> {
  const res = await postForm<TokenResponse>(TOKEN_URL, {
    grant_type: "authorization_code",
    client_id: app.clientId,
    client_secret: app.clientSecret,
    code,
    code_verifier: verifier,
    redirect_uri: redirectUri,
  });
  return toTokens(res, now);
}

/** Garmin returns a new refresh token every time; keep the newest. */
export async function refreshTokens(
  app: GarminApp,
  refreshToken: string,
  now = new Date(),
): Promise<GarminTokens> {
  const res = await postForm<TokenResponse>(TOKEN_URL, {
    grant_type: "refresh_token",
    client_id: app.clientId,
    client_secret: app.clientSecret,
    refresh_token: refreshToken,
  });
  return toTokens(res, now);
}
