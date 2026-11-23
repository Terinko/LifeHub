/** Garmin answered with a non-2xx status. The message never includes a query string or token. */
export class GarminError extends Error {
  readonly status: number;

  constructor(path: string, status: number) {
    super(`Garmin ${path} → HTTP ${status}`);
    this.name = "GarminError";
    this.status = status;
  }
}

const TIMEOUT_MS = 10_000;

/** A Garmin API call with the user's token; returns parsed JSON (or null for an empty body). */
export async function garminFetch<T>(
  url: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...init.headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new GarminError(new URL(url).pathname, res.status);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** POSTs a form to Garmin's token endpoint (no Authorization header). */
export async function postForm<T>(url: string, form: Record<string, string>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new GarminError(new URL(url).pathname, res.status);
  return (await res.json()) as T;
}
