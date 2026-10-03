type Entry = { value: Promise<unknown>; expires: number };

const entries = new Map<string, Entry>();

/**
 * Remembers a source's answer inside this warm Lambda for `ttlMs`, so a
 * burst of refreshes costs the outside sites one request. Failures aren't
 * kept: the next call tries again.
 */
export function cached<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = entries.get(key);
  if (hit && hit.expires > now) return hit.value as Promise<T>;

  const value = load();
  entries.set(key, { value, expires: now + ttlMs });
  value.catch(() => entries.delete(key));
  return value;
}

/** Test hook: forget everything. */
export const clearCache = () => entries.clear();
