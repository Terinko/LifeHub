/** An outside API answered with a non-2xx status. */
export class UpstreamError extends Error {
  readonly status: number;

  constructor(url: string, status: number, body: string) {
    super(`${url} → HTTP ${status}${body ? `: ${body.slice(0, 200)}` : ""}`);
    this.name = "UpstreamError";
    this.status = status;
  }
}

/** GETs JSON from an outside API, with a timeout so one slow host can't hang a request. */
export async function fetchJson<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 10_000,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new UpstreamError(url, res.status, body);
  }
  return (await res.json()) as T;
}

/** GETs a page as text (for sites with no JSON API), with the same timeout. */
export async function fetchText(
  url: string,
  init: RequestInit = {},
  timeoutMs = 10_000,
): Promise<string> {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new UpstreamError(url, res.status, body);
  }
  return res.text();
}
