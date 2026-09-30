import type { Place } from "./types";

// Places live in this browser only (no account sync). The keys predate the
// feature folder, so keep them as they are or saved places disappear.
const PLACES_KEY = "lifehub.weather.places";
const SELECTED_KEY = "lifehub.weather.selected";
const AUTO_LOCATE_KEY = "lifehub.weather.autoLocate";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const v = JSON.parse(localStorage.getItem(key) as string) as T | null;
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) — places just won't persist */
  }
}

export const loadPlaces = () => loadJson<Place[]>(PLACES_KEY, []);
export const savePlaces = (places: Place[]) => saveJson(PLACES_KEY, places);

export const loadSelected = () => loadJson<number>(SELECTED_KEY, 0);
export const saveSelected = (index: number) => saveJson(SELECTED_KEY, index);

/**
 * "Current location" refreshes itself every time Weather opens. Removing it
 * from the places list turns that off until "Use my location" is tapped.
 */
export function isAutoLocateOn(): boolean {
  try {
    return localStorage.getItem(AUTO_LOCATE_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setAutoLocate(on: boolean): void {
  try {
    localStorage.setItem(AUTO_LOCATE_KEY, String(on));
  } catch {
    /* storage unavailable (private mode) */
  }
}
