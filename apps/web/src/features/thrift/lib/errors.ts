import { ApiError } from "../../../shared/api/client";

/** When live listings can't come, why, for the check-it-yourself screen. */
export function selfCheckReason(error: Error): string | null {
  const status = error instanceof ApiError ? error.status : 0;
  if (status === 502) {
    return "Poshmark didn't answer just now, so check what it sold for yourself. It takes a minute.";
  }
  if (status === 429) {
    return "That's all of today's lookups, so check what it sold for yourself.";
  }
  return null;
}
