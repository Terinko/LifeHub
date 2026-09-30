import type { Place, PlacePreview } from "../types";

/**
 * Puts a fresh location fix into the places list. An existing location entry
 * is replaced where it is, so the user's selection doesn't move. A new one is
 * added first and selected, since it's the default place.
 */
export function upsertCurrentLocation(
  places: Place[],
  location: Place,
): { places: Place[]; selectIndex: number | null } {
  const index = places.findIndex((p) => p.isLocation);
  if (index >= 0) {
    const next = places.slice();
    next[index] = location;
    return { places: next, selectIndex: null };
  }
  return { places: [location, ...places], selectIndex: 0 };
}

/** Index of a saved place within ~1 km of `place`, or -1. */
export const findSamePlace = (places: Place[], place: Place) =>
  places.findIndex(
    (x) =>
      Math.abs(x.lat - place.lat) < 0.01 && Math.abs(x.lon - place.lon) < 0.01,
  );

/** Keeps a selection index inside a list of `count` places. */
export const clampSelection = (index: number, count: number) =>
  Math.max(0, Math.min(index, count - 1));

/**
 * Which way a finished touch moves between places: 1 (next), -1 (previous)
 * or 0 when it was too short or mostly vertical.
 */
export function swipeStep(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return 0;
  return dx < 0 ? 1 : -1;
}

/** The parts of an Open-Meteo geocoding response we read. */
export type GeocodeResponse = {
  results?: {
    id: number;
    name: string;
    admin1?: string;
    latitude: number;
    longitude: number;
  }[];
};

export const shapeSearchResults = (json: GeocodeResponse): Place[] =>
  (json.results || []).map((r) => ({
    id: `geo-${r.id}`,
    name: r.name,
    region: r.admin1 || "",
    lat: r.latitude,
    lon: r.longitude,
  }));

/** The parts of an NWS `/points` response we read. */
export type NwsPointResponse = {
  properties?: {
    relativeLocation?: { properties?: { city?: string; state?: string } };
  };
};

export function nameFromPoint(json: NwsPointResponse) {
  const rel = json.properties?.relativeLocation?.properties;
  return { name: rel?.city || "My location", region: rel?.state || "" };
}

/** One location's `current` block from a (possibly multi-point) request. */
export type CurrentOnlyResponse = {
  current?: {
    temperature_2m?: number | null;
    weather_code?: number;
    is_day?: number;
  };
};

/** Maps each place that got a temperature back to its preview. */
export function shapePreviews(
  places: Place[],
  json: CurrentOnlyResponse | CurrentOnlyResponse[],
): Record<string, PlacePreview> {
  const list = Array.isArray(json) ? json : [json];
  const out: Record<string, PlacePreview> = {};
  places.forEach((p, i) => {
    const cur = list[i]?.current;
    if (cur?.temperature_2m != null) {
      out[p.id] = {
        temp: cur.temperature_2m,
        code: cur.weather_code as number,
        isDay: cur.is_day === 1,
      };
    }
  });
  return out;
}
