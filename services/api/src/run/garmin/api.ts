import { garminFetch } from "./http";

const WELLNESS = "https://apis.garmin.com/wellness-api/rest";

// Garmin backfills at most 30 days per request.
const BACKFILL_DAYS = 30;
const DAY_S = 86_400;

/** The Garmin account's id; it stays the same across tokens, and every webhook names it. */
export async function garminUserId(accessToken: string): Promise<string> {
  const res = await garminFetch<{ userId: string }>(
    `${WELLNESS}/user/id`,
    accessToken,
  );
  return res.userId;
}

/**
 * Asks Garmin to send activities and VO2 max readings from `fromS` (Unix
 * seconds) to now. Garmin answers 202 and delivers them to the webhook later.
 */
export async function requestBackfill(
  accessToken: string,
  fromS: number,
  nowS: number,
): Promise<void> {
  for (let start = fromS; start < nowS; start += BACKFILL_DAYS * DAY_S) {
    const end = Math.min(start + BACKFILL_DAYS * DAY_S, nowS);
    const range = `summaryStartTimeInSeconds=${start}&summaryEndTimeInSeconds=${end}`;
    await garminFetch(`${WELLNESS}/backfill/activities?${range}`, accessToken);
    await garminFetch(`${WELLNESS}/backfill/userMetrics?${range}`, accessToken);
  }
}

/** Tells Garmin LifeHub no longer has this user's consent (required on disconnect). */
export const deregister = (accessToken: string) =>
  garminFetch(`${WELLNESS}/user/registration`, accessToken, {
    method: "DELETE",
  });

/** Only Garmin's own API host may be fetched from a ping's callback URL. */
export function isGarminCallback(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "apis.garmin.com" &&
      parsed.pathname.startsWith("/wellness-api/rest/")
    );
  } catch {
    return false;
  }
}
