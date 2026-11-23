/** What Garmin put on the URL when it sent the browser back to /run. */
export type GarminReturn =
  | { kind: "code"; code: string; state: string }
  | { kind: "error"; message: string }
  | undefined;

export function readGarminReturn(search: string): GarminReturn {
  const params = new URLSearchParams(search);
  const code = params.get("code");
  const state = params.get("state");
  if (code && state) return { kind: "code", code, state };
  if (params.get("error")) {
    return {
      kind: "error",
      message:
        params.get("error") === "access_denied"
          ? "Garmin wasn't connected: access was declined."
          : "Garmin couldn't finish connecting. Try again.",
    };
  }
  return undefined;
}

/** The address Garmin sends the browser back to; it must be registered with Garmin. */
export const garminRedirectUri = (origin: string) => `${origin}/run`;
