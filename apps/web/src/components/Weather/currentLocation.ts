import { reverseLookup } from "./weatherApi";

// "Current location" is a saved place that refreshes itself: every time
// Weather opens it asks the browser for a fresh position, without a click,
// and updates that entry. Removing it from the places list turns this off
// until "Use my location" is tapped again.

export type Place = {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  isLocation?: boolean;
};

const AUTO_LOCATE_KEY = "lifehub.weather.autoLocate";

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

/** Asks the browser for the device position and names it. */
export function locate(): Promise<Place> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        const { name, region } = await reverseLookup(lat, lon);
        resolve({
          id: `loc-${lat.toFixed(3)},${lon.toFixed(3)}`,
          name,
          region,
          lat,
          lon,
          isLocation: true,
        });
      },
      reject,
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  });
}

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
