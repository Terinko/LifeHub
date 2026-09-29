import type { EspnCookies } from "@lifehub/shared";

export const emptyCookies: EspnCookies = { espn_s2: "", swid: "" };

/** Both filled in, trimmed; otherwise undefined (keep what's saved). */
export function cookiesOrNothing(c: EspnCookies): EspnCookies | undefined {
  const espn_s2 = c.espn_s2.trim();
  const swid = c.swid.trim();
  return espn_s2 && swid ? { espn_s2, swid } : undefined;
}
