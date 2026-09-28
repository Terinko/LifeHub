import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { EspnCookies } from "@lifehub/shared";
import { HttpError } from "../shared/http";

// ESPN's espn_s2 / SWID cookies are effectively a login session for a
// private league, so they're stored encrypted (AES-256-GCM) and never sent
// back to the browser.

export type EncryptedCookies = {
  espnCookieCipher: string;
  espnCookieIv: string;
  espnCookieTag: string;
};

function key(): Buffer {
  const buf = Buffer.from(process.env.FANTASY_ENC_KEY ?? "", "hex");
  if (buf.length !== 32) {
    throw new HttpError(
      500,
      "Server misconfiguration: FANTASY_ENC_KEY must be 64 hex characters.",
    );
  }
  return buf;
}

export function encryptCookies(cookies: EspnCookies): EncryptedCookies {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(cookies), "utf8"),
    cipher.final(),
  ]);
  return {
    espnCookieCipher: data.toString("base64"),
    espnCookieIv: iv.toString("base64"),
    espnCookieTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptCookies(stored: EncryptedCookies): EspnCookies {
  const encKey = key();
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encKey,
      Buffer.from(stored.espnCookieIv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(stored.espnCookieTag, "base64"));
    const data = Buffer.concat([
      decipher.update(Buffer.from(stored.espnCookieCipher, "base64")),
      decipher.final(),
    ]);
    return JSON.parse(data.toString("utf8")) as EspnCookies;
  } catch {
    throw new Error(
      "Saved ESPN cookies can't be read anymore. Update them from My Leagues.",
    );
  }
}
