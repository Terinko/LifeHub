import { HttpError } from "../shared/http";
import { GarminError } from "./garmin/http";

/**
 * A short reason for a failure, safe to show: Garmin errors name only the
 * path and status, and other errors only their type.
 */
export function describe(error: unknown): string {
  if (error instanceof GarminError || error instanceof HttpError) {
    return error.message;
  }
  return error instanceof Error ? error.name : "Unknown error";
}

/**
 * Runs one step of loading the page. An unexpected failure says which step
 * failed and why, so a broken load can be traced without the server logs.
 */
export async function step<T>(label: string, run: () => Promise<T>) {
  try {
    return await run();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error(`Run: ${label} failed`, error);
    throw new HttpError(
      500,
      `Couldn't load your training from Garmin while ${label} (${describe(error)})`,
    );
  }
}
