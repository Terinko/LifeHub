import { shapeAlerts, type NwsAlertsResponse } from "./lib/alerts";
import { BLEND_MODELS } from "./lib/blend";
import {
  shapeForecast,
  type OpenMeteoExtras,
  type OpenMeteoForecast,
} from "./lib/forecast";
import {
  nameFromPoint,
  shapePreviews,
  shapeSearchResults,
  type CurrentOnlyResponse,
  type GeocodeResponse,
  type NwsPointResponse,
} from "./lib/places";
import type {
  Forecast,
  Place,
  PlacePreview,
  PlaceWeather,
  WeatherAlert,
} from "./types";

// Weather has no LifeHub backend: these free, keyless services are called
// straight from the browser (all of them send CORS headers), so this file
// uses fetch directly instead of shared/api/client.

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const NWS_URL = "https://api.weather.gov";
const GEO_JSON = { headers: { Accept: "application/geo+json" } };

// Open-Meteo returns a bare `nan` (invalid JSON) for lat/lon when a requested
// model doesn't cover the point — e.g. NBM (lower 48 only) for Alaska/Hawaii.
async function fetchJsonTolerant<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) throw new Error(`Weather service error (${res.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    return JSON.parse(text.replace(/:\s*nan\b/g, ":null")) as T;
  }
}

export async function fetchForecast(
  lat: number,
  lon: number,
): Promise<Forecast> {
  const common =
    `latitude=${lat}&longitude=${lon}&temperature_unit=fahrenheit` +
    `&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto`;

  const mainUrl =
    `${FORECAST_URL}?${common}&forecast_days=10&models=${BLEND_MODELS.join(",")}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,` +
    `is_day,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
    `&hourly=temperature_2m,precipitation_probability,weather_code,is_day` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,` +
    `precipitation_probability_max,sunrise,sunset`;

  // Default blend fills the fields NBM doesn't publish (UV, pressure) and
  // supplies the 15-minute precipitation nowcast.
  const extrasUrl =
    `${FORECAST_URL}?${common}&forecast_days=10` +
    `&current=pressure_msl,uv_index,precipitation` +
    `&daily=uv_index_max&minutely_15=precipitation&forecast_minutely_15=8`;

  const [main, extras] = await Promise.all([
    fetchJsonTolerant<OpenMeteoForecast>(mainUrl),
    fetchJsonTolerant<OpenMeteoExtras>(extrasUrl).catch(() => null),
  ]);
  return shapeForecast(main, extras);
}

/** Active National Weather Service alerts for a point (US only). */
export async function fetchAlerts(
  lat: number,
  lon: number,
): Promise<WeatherAlert[]> {
  const res = await fetch(
    `${NWS_URL}/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`,
    GEO_JSON,
  );
  if (!res.ok) return [];
  return shapeAlerts((await res.json()) as NwsAlertsResponse);
}

/** Forecast and alerts together; missing alerts never fail the forecast. */
export async function fetchPlaceWeather(place: Place): Promise<PlaceWeather> {
  const [forecast, alerts] = await Promise.all([
    fetchForecast(place.lat, place.lon),
    fetchAlerts(place.lat, place.lon).catch(() => []),
  ]);
  return { forecast, alerts };
}

export async function searchPlaces(query: string): Promise<Place[]> {
  const res = await fetch(
    `${GEOCODE_URL}?name=${encodeURIComponent(query)}&count=8&countryCode=US&language=en`,
  );
  if (!res.ok) return [];
  return shapeSearchResults((await res.json()) as GeocodeResponse);
}

// NWS points lookup doubles as a free reverse geocoder for "use my location".
export async function reverseLookup(lat: number, lon: number) {
  try {
    const res = await fetch(
      `${NWS_URL}/points/${lat.toFixed(4)},${lon.toFixed(4)}`,
      GEO_JSON,
    );
    if (!res.ok) throw new Error();
    return nameFromPoint((await res.json()) as NwsPointResponse);
  } catch {
    return { name: "My location", region: "" };
  }
}

// Lightweight current conditions for the places list (one request per model
// for all places). NBM first to match the main screen; anything it doesn't
// cover (Alaska, Hawaii) falls back to Open-Meteo's default blend.
async function fetchCurrentBatch(places: Place[], modelParam: string) {
  const lats = places.map((p) => p.lat).join(",");
  const lons = places.map((p) => p.lon).join(",");
  const json = await fetchJsonTolerant<
    CurrentOnlyResponse | CurrentOnlyResponse[]
  >(
    `${FORECAST_URL}?latitude=${lats}&longitude=${lons}${modelParam}` +
      `&current=temperature_2m,weather_code,is_day&temperature_unit=fahrenheit&timezone=auto`,
  );
  return shapePreviews(places, json);
}

export async function fetchPlacePreviews(
  places: Place[],
): Promise<Record<string, PlacePreview>> {
  if (!places.length) return {};
  const out = await fetchCurrentBatch(places, "&models=ncep_nbm_conus");
  const missing = places.filter((p) => !out[p.id]);
  if (missing.length) Object.assign(out, await fetchCurrentBatch(missing, ""));
  return out;
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
