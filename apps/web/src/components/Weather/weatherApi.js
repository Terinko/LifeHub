// Data layer for the Weather tool. Everything here is free, keyless, and
// called straight from the browser (all three hosts send CORS headers).
//
// Model choice comes from a 60-day backtest against airport observations at
// six US stations (Sep 2026): averaging NBM + ICON + ECMWF beat every single
// model on temperature, and only calling a day "rainy" when NBM forecasts
// >= 0.10 in cut rain false alarms by ~40% vs. any-trace.

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const NWS_URL = "https://api.weather.gov";

const BLEND_MODELS = ["ncep_nbm_conus", "icon_seamless", "ecmwf_ifs025"];
const RAIN_DAY_THRESHOLD_IN = 0.1;

// Open-Meteo returns a bare `nan` (invalid JSON) for lat/lon when a requested
// model doesn't cover the point — e.g. NBM (lower 48 only) for Alaska/Hawaii.
async function fetchJsonTolerant(url) {
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) throw new Error(`Weather service error (${res.status})`);
  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(text.replace(/:\s*nan\b/g, ":null"));
  }
}

const avg = (values) => {
  const v = values.filter((x) => x != null && !Number.isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

// First non-null value across models, in preference order.
const pick = (block, field, i) => {
  for (const m of BLEND_MODELS) {
    const arr = block[`${field}_${m}`];
    if (arr && arr[i] != null) return arr[i];
  }
  return null;
};

const blend = (block, field, i) =>
  avg(BLEND_MODELS.map((m) => block[`${field}_${m}`]?.[i]));

// --- Weather codes (WMO) ---------------------------------------------------

const WET_CODES = (c) =>
  (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95;
const SNOW_CODES = (c) => (c >= 71 && c <= 77) || c === 85 || c === 86;

const LABELS = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Cloudy",
  45: "Fog",
  48: "Freezing fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorms",
  96: "Thunderstorms with hail",
  99: "Thunderstorms with hail",
};

export const codeLabel = (code, isDay = true) => {
  if (!isDay && (code === 0 || code === 1))
    return code === 0 ? "Clear night" : "Mostly clear";
  return LABELS[code] ?? "—";
};

// Which background simulation to run for a weather code.
export function sceneFor(code, isDay) {
  let kind = "clear";
  let intensity = 1;
  if (code === 2) kind = "partly";
  else if (code === 3) kind = "cloudy";
  else if (code === 45 || code === 48) kind = "fog";
  else if (code >= 95) kind = "storm";
  else if (SNOW_CODES(code)) {
    kind = "snow";
    intensity =
      code === 75 || code === 86 ? 2 : code === 71 || code === 85 ? 0.6 : 1;
  } else if (WET_CODES(code)) {
    kind = "rain";
    intensity = [65, 67, 82].includes(code)
      ? 2
      : [51, 56, 61, 80].includes(code)
        ? 0.55
        : 1;
  }
  return { kind, isDay: !!isDay, intensity };
}

// The backtest's rain rule, applied to the daily summary: a wet code with
// under 0.10 in forecast gets downgraded, and a dry code with 0.10 in or
// more gets upgraded. Snow codes are left alone.
function adjustDailyCode(code, sumIn) {
  if (code == null) return code;
  if (SNOW_CODES(code)) return code;
  if (WET_CODES(code) && (sumIn ?? 0) < RAIN_DAY_THRESHOLD_IN) {
    // Showers and storms are usually hit-or-miss with sun around.
    return code >= 80 ? 2 : 3;
  }
  if (!WET_CODES(code) && (sumIn ?? 0) >= RAIN_DAY_THRESHOLD_IN) {
    return sumIn >= 0.5 ? 63 : 61;
  }
  return code;
}

// --- Forecast ----------------------------------------------------------------

export async function fetchForecast(lat, lon) {
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
    fetchJsonTolerant(mainUrl),
    fetchJsonTolerant(extrasUrl).catch(() => null),
  ]);

  const h = main.hourly;
  const d = main.daily;
  const c = main.current || {};

  const currentHour = (c.time || h.time[0]).slice(0, 13) + ":00";
  let start = h.time.findIndex((t) => t >= currentHour);
  if (start < 0) start = 0;

  const hourly = [];
  for (let i = start; i < Math.min(start + 24, h.time.length); i++) {
    hourly.push({
      time: h.time[i],
      temp: blend(h, "temperature_2m", i),
      pop: pick(h, "precipitation_probability", i),
      code: pick(h, "weather_code", i),
      isDay: pick(h, "is_day", i) === 1,
    });
  }

  const daily = d.time.map((date, i) => {
    const sum = pick(d, "precipitation_sum", i);
    return {
      date,
      code: adjustDailyCode(pick(d, "weather_code", i), sum),
      hi: blend(d, "temperature_2m_max", i),
      lo: blend(d, "temperature_2m_min", i),
      pop: pick(d, "precipitation_probability_max", i),
      sum,
      sunrise: pick(d, "sunrise", i),
      sunset: pick(d, "sunset", i),
      uv: extras?.daily?.uv_index_max?.[i] ?? null,
    };
  });

  // `current` isn't split per model; fall back to the hourly blend if the
  // primary model has no value for this point.
  const current = {
    time: c.time,
    temp: c.temperature_2m ?? hourly[0]?.temp,
    feels: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    dewPoint: c.dew_point_2m,
    isDay: (c.is_day ?? (hourly[0]?.isDay ? 1 : 0)) === 1,
    code: c.weather_code ?? hourly[0]?.code ?? 0,
    cloud: c.cloud_cover,
    windSpeed: c.wind_speed_10m,
    windDir: c.wind_direction_10m,
    windGusts: c.wind_gusts_10m,
    pressureInHg: extras?.current?.pressure_msl
      ? extras.current.pressure_msl * 0.02953
      : null,
    uv: extras?.current?.uv_index ?? null,
    precipNow: extras?.current?.precipitation ?? 0,
  };

  const nowcastValues = extras?.minutely_15?.precipitation?.slice(0, 8) ?? [];

  return {
    timezone: main.timezone,
    current,
    hourly,
    daily,
    nowcast: {
      values: nowcastValues,
      text: describeNowcast(nowcastValues, current.precipNow, current.code),
    },
    updatedAt: Date.now(),
  };
}

// Plain-language summary of the next two hours of 15-minute precipitation.
// The current weather code counts too, so the card never says "no rain"
// right under a hero that says "Light drizzle".
function describeNowcast(values, precipNow, currentCode) {
  if (!values.length) return null;
  const WET = 0.005;
  const wetNow =
    (precipNow ?? 0) > WET ||
    values[0] > WET ||
    (WET_CODES(currentCode) && !SNOW_CODES(currentCode));
  const firstChange = values.findIndex((v) => v > WET !== wetNow);
  const mins = firstChange * 15;
  if (wetNow) {
    if (firstChange === -1) return "Rain continuing for the next 2 hours";
    return mins === 0
      ? "Rain ending shortly"
      : `Rain ending in about ${mins} min`;
  }
  if (firstChange === -1) return "No rain expected for the next 2 hours";
  return mins === 0
    ? "Rain starting shortly"
    : `Rain starting in about ${mins} min`;
}

// --- Alerts (National Weather Service) --------------------------------------

export async function fetchAlerts(lat, lon) {
  const res = await fetch(
    `${NWS_URL}/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`,
    { headers: { Accept: "application/geo+json" } },
  );
  if (!res.ok) return [];
  const j = await res.json();
  const rank = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3, Unknown: 4 };
  return (j.features || [])
    .map((f) => ({
      id: f.properties.id,
      event: f.properties.event,
      headline: f.properties.headline,
      severity: f.properties.severity,
      ends: f.properties.ends || f.properties.expires,
      description: f.properties.description,
      instruction: f.properties.instruction,
      sender: f.properties.senderName,
    }))
    .sort((a, b) => (rank[a.severity] ?? 5) - (rank[b.severity] ?? 5));
}

// --- Places ------------------------------------------------------------------

export async function searchPlaces(query) {
  const res = await fetch(
    `${GEOCODE_URL}?name=${encodeURIComponent(query)}&count=8&countryCode=US&language=en`,
  );
  if (!res.ok) return [];
  const j = await res.json();
  return (j.results || []).map((r) => ({
    id: `geo-${r.id}`,
    name: r.name,
    region: r.admin1 || "",
    lat: r.latitude,
    lon: r.longitude,
  }));
}

// NWS points lookup doubles as a free reverse geocoder for "use my location".
export async function reverseLookup(lat, lon) {
  try {
    const res = await fetch(
      `${NWS_URL}/points/${lat.toFixed(4)},${lon.toFixed(4)}`,
      {
        headers: { Accept: "application/geo+json" },
      },
    );
    if (!res.ok) throw new Error();
    const j = await res.json();
    const rel = j.properties?.relativeLocation?.properties;
    return { name: rel?.city || "My location", region: rel?.state || "" };
  } catch {
    return { name: "My location", region: "" };
  }
}

// Lightweight current conditions for the places list (one request per model
// for all places). NBM first to match the main screen; anything it doesn't
// cover (Alaska, Hawaii) falls back to Open-Meteo's default blend.
async function fetchCurrentBatch(places, modelParam) {
  const lats = places.map((p) => p.lat).join(",");
  const lons = places.map((p) => p.lon).join(",");
  const j = await fetchJsonTolerant(
    `${FORECAST_URL}?latitude=${lats}&longitude=${lons}${modelParam}` +
      `&current=temperature_2m,weather_code,is_day&temperature_unit=fahrenheit&timezone=auto`,
  );
  const list = Array.isArray(j) ? j : [j];
  const out = {};
  places.forEach((p, i) => {
    const cur = list[i]?.current;
    if (cur?.temperature_2m != null) {
      out[p.id] = {
        temp: cur.temperature_2m,
        code: cur.weather_code,
        isDay: cur.is_day === 1,
      };
    }
  });
  return out;
}

export async function fetchPlacePreviews(places) {
  if (!places.length) return {};
  const out = await fetchCurrentBatch(places, "&models=ncep_nbm_conus");
  const missing = places.filter((p) => !out[p.id]);
  if (missing.length) Object.assign(out, await fetchCurrentBatch(missing, ""));
  return out;
}
