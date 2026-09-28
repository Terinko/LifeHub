import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Cloudy,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Umbrella,
  Wind,
  Droplets,
  Gauge,
  Sunrise,
  Sunset,
  SunMedium,
  Clock,
  CalendarDays,
  TriangleAlert,
  List,
  Search,
  LocateFixed,
  Trash2,
  X,
  ChevronDown,
} from "lucide-react";
import WeatherScene from "./WeatherScene";
import {
  codeLabel,
  fetchAlerts,
  fetchForecast,
  fetchPlacePreviews,
  reverseLookup,
  sceneFor,
  searchPlaces,
} from "./weatherApi";
import "./WeatherTool.css";
import { API_BASE } from "../../config";

const PLACES_KEY = "lifehub.weather.places";
const SELECTED_KEY = "lifehub.weather.selected";
const STALE_MS = 10 * 60 * 1000;

// --- small helpers -----------------------------------------------------------

const loadJson = (key, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
};
const saveJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) — places just won't persist */
  }
};

const round = (n) => (n == null ? "--" : Math.round(n));

function WeatherIcon({ code, isDay = true, size = 22, className }) {
  let Icon = isDay ? Sun : Moon;
  if (code === 2 || code === 1)
    Icon = code === 1 ? (isDay ? Sun : Moon) : isDay ? CloudSun : CloudMoon;
  else if (code === 3) Icon = Cloudy;
  else if (code === 45 || code === 48) Icon = CloudFog;
  else if (code >= 51 && code <= 57) Icon = CloudDrizzle;
  else if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))
    Icon = CloudRain;
  else if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    Icon = CloudSnow;
  else if (code >= 95) Icon = CloudLightning;
  return (
    <Icon
      size={size}
      strokeWidth={1.6}
      className={className}
      aria-hidden="true"
    />
  );
}

const hourLabel = (iso) => {
  const h = Number(iso.slice(11, 13));
  return `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "AM" : "PM"}`;
};
const clockLabel = (iso) => {
  if (!iso) return "--";
  const h = Number(iso.slice(11, 13));
  const m = iso.slice(14, 16);
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? "AM" : "PM"}`;
};
const dayLabel = (date, i) =>
  i === 0
    ? "Today"
    : new Date(`${date}T12:00`).toLocaleDateString("en-US", {
        weekday: "short",
      });
const compass = (deg) =>
  deg == null
    ? ""
    : [
        "N",
        "NNE",
        "NE",
        "ENE",
        "E",
        "ESE",
        "SE",
        "SSE",
        "S",
        "SSW",
        "SW",
        "WSW",
        "W",
        "WNW",
        "NW",
        "NNW",
      ][Math.round(deg / 22.5) % 16];
const uvLabel = (uv) =>
  uv == null
    ? ""
    : uv < 3
      ? "Low"
      : uv < 6
        ? "Moderate"
        : uv < 8
          ? "High"
          : uv < 11
            ? "Very high"
            : "Extreme";

// Cool-to-warm color for the 10-day range bars.
function tempColor(t) {
  const stops = [
    [20, [120, 170, 255]],
    [45, [110, 205, 230]],
    [62, [150, 220, 150]],
    [75, [247, 200, 115]],
    [88, [243, 150, 90]],
    [100, [232, 95, 80]],
  ];
  if (t <= stops[0][0]) return `rgb(${stops[0][1]})`;
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      const f = (t - t0) / (t1 - t0);
      return `rgb(${c0.map((c, k) => Math.round(c + (c1[k] - c) * f)).join(",")})`;
    }
  }
  return `rgb(${stops[stops.length - 1][1]})`;
}

// Animated count between temperatures when the value changes.
function useCountUp(target) {
  const [shown, setShown] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    if (target == null) return undefined;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      fromRef.current == null
    ) {
      fromRef.current = target;
      const id = requestAnimationFrame(() => setShown(target));
      return () => cancelAnimationFrame(id);
    }
    const from = fromRef.current;
    const start = performance.now();
    let id;
    const step = (now) => {
      const p = Math.min(1, (now - start) / 700);
      const v = from + (target - from) * (1 - Math.pow(1 - p, 3));
      setShown(v);
      if (p < 1) id = requestAnimationFrame(step);
      else fromRef.current = target;
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [target]);
  return shown;
}

const SKY_KEYS = [
  "clear",
  "partly",
  "cloudy",
  "fog",
  "rain",
  "storm",
  "snow",
].flatMap((k) => [`${k}-day`, `${k}-night`]);

// --- component ---------------------------------------------------------------

const WeatherTool = () => {
  const navigate = useNavigate();
  const [places, setPlaces] = useState(() => loadJson(PLACES_KEY, []));
  const [selected, setSelected] = useState(() => loadJson(SELECTED_KEY, 0));
  const [forecasts, setForecasts] = useState({});
  const [alerts, setAlerts] = useState({});
  const [errors, setErrors] = useState({});
  const [showPlaces, setShowPlaces] = useState(false);
  const [expandedAlert, setExpandedAlert] = useState(null);
  const [locating, setLocating] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const place = places[Math.min(selected, places.length - 1)] || null;
  const data = place ? forecasts[place.id] : null;

  useEffect(() => saveJson(PLACES_KEY, places), [places]);
  useEffect(() => saveJson(SELECTED_KEY, selected), [selected]);

  // Tile visibility is gated by the `weather` permission — keep people who
  // navigate here directly by URL consistent with that.
  useEffect(() => {
    (async () => {
      try {
        const session = await fetchAuthSession();
        const res = await fetch(`${API_BASE}/admin/users?me=true`, {
          headers: {
            Authorization: `Bearer ${session.tokens.idToken.toString()}`,
          },
        });
        const profile = await res.json();
        if (profile?.role !== "ADMIN" && !profile?.permissions?.weather)
          navigate("/");
      } catch {
        /* network hiccup — don't lock the user out of public weather data */
      }
    })();
  }, [navigate]);

  // Refs mirror what's cached/in flight so repeated triggers (focus, swipes,
  // StrictMode double effects) don't refetch fresh data.
  const cacheRef = useRef({});
  const inflightRef = useRef(new Set());

  const load = useCallback(async (p, force = false) => {
    if (!p) return;
    const existing = cacheRef.current[p.id];
    if (!force && existing && Date.now() - existing.updatedAt < STALE_MS)
      return;
    if (inflightRef.current.has(p.id)) return;
    inflightRef.current.add(p.id);
    try {
      const [f, a] = await Promise.all([
        fetchForecast(p.lat, p.lon),
        fetchAlerts(p.lat, p.lon).catch(() => []),
      ]);
      cacheRef.current[p.id] = f;
      setForecasts((cur) => ({ ...cur, [p.id]: f }));
      setAlerts((cur) => ({ ...cur, [p.id]: a }));
      setErrors((cur) => ({ ...cur, [p.id]: null }));
    } catch (e) {
      console.error(e);
      setErrors((cur) => ({ ...cur, [p.id]: "Couldn't load the forecast." }));
    } finally {
      inflightRef.current.delete(p.id);
    }
  }, []);

  useEffect(() => {
    // Fetch on place change — load() only sets state after its awaits resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(place);
  }, [place, load]);

  // Refresh stale data when the app comes back to the foreground, and keep
  // the "updated" label ticking.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setNow(Date.now());
        load(place);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(id);
    };
  }, [place, load]);

  const addPlace = (p) => {
    const idx = places.findIndex(
      (x) => Math.abs(x.lat - p.lat) < 0.01 && Math.abs(x.lon - p.lon) < 0.01,
    );
    if (idx >= 0) {
      setSelected(idx);
    } else {
      setPlaces([...places, p]);
      setSelected(places.length);
    }
    setShowPlaces(false);
  };

  const removePlace = (id) => {
    const next = places.filter((p) => p.id !== id);
    setPlaces(next);
    setSelected((s) => Math.max(0, Math.min(s, next.length - 1)));
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const { name, region } = await reverseLookup(lat, lon);
        setLocating(false);
        addPlace({
          id: `loc-${lat.toFixed(3)},${lon.toFixed(3)}`,
          name,
          region,
          lat,
          lon,
          isLocation: true,
        });
      },
      () => {
        setLocating(false);
        alert(
          "Location access was blocked. Search for a city or zip code instead.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  };

  // Swipe between saved places.
  const touch = useRef(null);
  const onTouchStart = (e) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    if (!touch.current || places.length < 2) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    setSelected((s) =>
      Math.max(0, Math.min(places.length - 1, s + (dx < 0 ? 1 : -1))),
    );
  };

  const scene = data
    ? sceneFor(data.current.code, data.current.isDay)
    : { kind: "partly", isDay: true, intensity: 1 };
  const skyKey = `${scene.kind}-${scene.isDay ? "day" : "night"}`;
  const heroTemp = useCountUp(data?.current.temp ?? null);
  const placeAlerts = place ? alerts[place.id] || [] : [];

  return (
    <div className="wx-root">
      {SKY_KEYS.map((k) => (
        <div
          key={k}
          className={`wx-sky wx-sky-${k}${k === skyKey ? " on" : ""}`}
        />
      ))}
      <WeatherScene scene={scene} />

      <div
        className="wx-content"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <header className="wx-header">
          <button className="wx-link" onClick={() => navigate("/")}>
            ‹ Hub
          </button>
          <button
            className="wx-icon-btn"
            onClick={() => setShowPlaces(true)}
            aria-label="Places"
          >
            <List size={22} strokeWidth={1.8} />
          </button>
        </header>

        {!place && (
          <div className="wx-empty">
            <CloudSun size={56} strokeWidth={1.4} aria-hidden="true" />
            <h1>Add your first place</h1>
            <p>Use your location or search for a US city or zip code.</p>
            <button
              className="wx-glass wx-cta"
              onClick={useMyLocation}
              disabled={locating}
            >
              <LocateFixed size={18} aria-hidden="true" />
              {locating ? "Finding you…" : "Use my location"}
            </button>
            <button
              className="wx-glass wx-cta"
              onClick={() => setShowPlaces(true)}
            >
              <Search size={18} aria-hidden="true" />
              Search places
            </button>
          </div>
        )}

        {place && (
          <>
            <section className="wx-hero">
              <div className="wx-place">{place.name}</div>
              {places.length > 1 && (
                <div className="wx-dots" aria-hidden="true">
                  {places.map((p, i) => (
                    <span key={p.id} className={i === selected ? "on" : ""} />
                  ))}
                </div>
              )}
              {data ? (
                <>
                  <WeatherIcon
                    code={data.current.code}
                    isDay={data.current.isDay}
                    size={52}
                    className="wx-hero-icon"
                  />
                  <div className="wx-hero-temp">{round(heroTemp)}°</div>
                  <div className="wx-hero-label">
                    {codeLabel(data.current.code, data.current.isDay)}
                  </div>
                  <div className="wx-hero-sub">
                    H {round(data.daily[0]?.hi)}° L {round(data.daily[0]?.lo)}°
                    · Feels like {round(data.current.feels)}°
                  </div>
                </>
              ) : errors[place.id] ? null : (
                <div className="wx-hero-sub wx-loading">Loading forecast…</div>
              )}
            </section>

            {errors[place.id] && !data && (
              <div className="wx-glass wx-error">
                {errors[place.id]}
                <button className="wx-pill" onClick={() => load(place, true)}>
                  Try again
                </button>
              </div>
            )}

            {data && (
              <>
                {placeAlerts.map((a) => (
                  <button
                    key={a.id}
                    className={`wx-glass wx-alert wx-alert-${(a.severity || "unknown").toLowerCase()}`}
                    onClick={() =>
                      setExpandedAlert(expandedAlert === a.id ? null : a.id)
                    }
                  >
                    <div className="wx-alert-top">
                      <TriangleAlert
                        size={20}
                        className="wx-pulse"
                        aria-hidden="true"
                      />
                      <div className="wx-alert-text">
                        <div className="wx-alert-title">{a.event}</div>
                        <div className="wx-small">
                          {a.ends
                            ? `Until ${new Date(a.ends).toLocaleString([], {
                                weekday: "short",
                                hour: "numeric",
                                minute: "2-digit",
                              })} · `
                            : ""}
                          National Weather Service
                        </div>
                      </div>
                      <ChevronDown
                        size={18}
                        className={`wx-chevron${expandedAlert === a.id ? " open" : ""}`}
                        aria-hidden="true"
                      />
                    </div>
                    {expandedAlert === a.id && (
                      <div className="wx-alert-body">
                        {a.description}
                        {a.instruction ? `\n\n${a.instruction}` : ""}
                      </div>
                    )}
                  </button>
                ))}

                {data.nowcast.text && (
                  <div className="wx-glass">
                    <div className="wx-label">
                      <Umbrella size={13} aria-hidden="true" /> NEXT 2 HOURS
                    </div>
                    <div className="wx-nowcast-text">{data.nowcast.text}</div>
                    {data.nowcast.values.some((v) => v > 0.005) && (
                      <>
                        <div className="wx-nowcast-bars">
                          {data.nowcast.values.map((v, i) => (
                            <i
                              key={i}
                              style={{
                                height: `${3 + Math.min(1, v / 0.08) * 30}px`,
                              }}
                            />
                          ))}
                        </div>
                        <div className="wx-nowcast-axis">
                          <span>Now</span>
                          <span>1 hr</span>
                          <span>2 hr</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="wx-glass">
                  <div className="wx-label">
                    <Clock size={13} aria-hidden="true" /> HOURLY
                  </div>
                  <div className="wx-hourly">
                    {data.hourly.map((h, i) => (
                      <div key={h.time} className="wx-hour">
                        <span className="wx-small">
                          {i === 0 ? "Now" : hourLabel(h.time)}
                        </span>
                        <WeatherIcon code={h.code} isDay={h.isDay} size={22} />
                        <span className="wx-pop">
                          {h.pop >= 20 ? `${h.pop}%` : " "}
                        </span>
                        <b>{round(h.temp)}°</b>
                      </div>
                    ))}
                  </div>
                </div>

                <TenDay data={data} />

                <div className="wx-tiles">
                  <div className="wx-glass wx-tile">
                    <div className="wx-label">
                      <Wind size={13} aria-hidden="true" /> WIND
                    </div>
                    <div className="wx-tile-value">
                      {round(data.current.windSpeed)} mph
                    </div>
                    <div className="wx-small">
                      Gusts {round(data.current.windGusts)} ·{" "}
                      {compass(data.current.windDir)}
                    </div>
                  </div>
                  <div className="wx-glass wx-tile">
                    <div className="wx-label">
                      <Droplets size={13} aria-hidden="true" /> HUMIDITY
                    </div>
                    <div className="wx-tile-value">
                      {round(data.current.humidity)}%
                    </div>
                    <div className="wx-small">
                      Dew point {round(data.current.dewPoint)}°
                    </div>
                  </div>
                  <div className="wx-glass wx-tile">
                    <div className="wx-label">
                      <SunMedium size={13} aria-hidden="true" /> UV INDEX
                    </div>
                    <div className="wx-tile-value">
                      {round(data.current.uv)}
                    </div>
                    <div className="wx-small">
                      {uvLabel(data.current.uv)}
                      {data.daily[0]?.uv != null
                        ? ` · peak ${round(data.daily[0].uv)}`
                        : ""}
                    </div>
                  </div>
                  <div className="wx-glass wx-tile">
                    <div className="wx-label">
                      <Gauge size={13} aria-hidden="true" /> PRESSURE
                    </div>
                    <div className="wx-tile-value">
                      {data.current.pressureInHg
                        ? data.current.pressureInHg.toFixed(2)
                        : "--"}
                    </div>
                    <div className="wx-small">inHg</div>
                  </div>
                </div>

                <div className="wx-glass wx-sun">
                  <span>
                    <Sunrise size={18} aria-hidden="true" />{" "}
                    {clockLabel(data.daily[0]?.sunrise)}
                  </span>
                  <span>
                    <Sunset size={18} aria-hidden="true" />{" "}
                    {clockLabel(data.daily[0]?.sunset)}
                  </span>
                </div>

                <footer className="wx-footer">
                  Updated{" "}
                  {Math.max(0, Math.round((now - data.updatedAt) / 60000))} min
                  ago ·{" "}
                  <a
                    href="https://open-meteo.com/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Weather data by Open-Meteo.com
                  </a>{" "}
                  (CC BY 4.0) · Alerts from the National Weather Service
                </footer>
              </>
            )}
          </>
        )}
      </div>

      {showPlaces && (
        <PlacesSheet
          places={places}
          selected={selected}
          onSelect={(i) => {
            setSelected(i);
            setShowPlaces(false);
          }}
          onAdd={addPlace}
          onRemove={removePlace}
          onUseLocation={useMyLocation}
          locating={locating}
          onClose={() => setShowPlaces(false)}
        />
      )}
    </div>
  );
};

function TenDay({ data }) {
  const days = data.daily.filter((d) => d.hi != null && d.lo != null);
  if (!days.length) return null;
  const weekLo = Math.min(...days.map((d) => d.lo));
  const weekHi = Math.max(...days.map((d) => d.hi));
  const span = Math.max(1, weekHi - weekLo);
  const pct = (t) => ((t - weekLo) / span) * 100;

  return (
    <div className="wx-glass">
      <div className="wx-label">
        <CalendarDays size={13} aria-hidden="true" /> 10-DAY FORECAST
      </div>
      {days.map((d, i) => (
        <div key={d.date} className="wx-day">
          <span className="wx-day-name">{dayLabel(d.date, i)}</span>
          <span className="wx-day-icon">
            <WeatherIcon code={d.code} size={20} />
            {d.pop >= 30 && <span className="wx-pop">{d.pop}%</span>}
          </span>
          <span className="wx-day-lo">{round(d.lo)}°</span>
          <span className="wx-range">
            <i
              style={{
                left: `${pct(d.lo)}%`,
                width: `${Math.max(4, pct(d.hi) - pct(d.lo))}%`,
                background: `linear-gradient(90deg, ${tempColor(d.lo)}, ${tempColor(d.hi)})`,
              }}
            />
            {i === 0 && data.current.temp != null && (
              <b
                style={{
                  left: `${Math.min(100, Math.max(0, pct(data.current.temp)))}%`,
                }}
              />
            )}
          </span>
          <span className="wx-day-hi">{round(d.hi)}°</span>
        </div>
      ))}
    </div>
  );
}

function PlacesSheet({
  places,
  selected,
  onSelect,
  onAdd,
  onRemove,
  onUseLocation,
  locating,
  onClose,
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [editing, setEditing] = useState(false);
  const [previews, setPreviews] = useState({});

  useEffect(() => {
    let cancelled = false;
    fetchPlacePreviews(places)
      .then((p) => !cancelled && setPreviews(p))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [places]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return undefined; // results only render for 2+ chars
    let cancelled = false;
    const id = setTimeout(async () => {
      setSearching(true);
      const r = await searchPlaces(q).catch(() => []);
      if (!cancelled) {
        setResults(r);
        setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query]);

  return (
    <div className="wx-sheet">
      <div className="wx-blob wx-blob-a" />
      <div className="wx-blob wx-blob-b" />
      <div className="wx-blob wx-blob-c" />
      <div className="wx-sheet-inner">
        <div className="wx-sheet-head">
          <h2>Places</h2>
          <div className="wx-sheet-actions">
            {places.length > 0 && (
              <button className="wx-link" onClick={() => setEditing(!editing)}>
                {editing ? "Done editing" : "Edit"}
              </button>
            )}
            <button
              className="wx-icon-btn"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <label className="wx-glass wx-search">
          <Search size={16} aria-hidden="true" />
          <input
            placeholder="Search city or zip code"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        {query.trim().length >= 2 ? (
          <div className="wx-glass wx-results">
            {searching && <div className="wx-small">Searching…</div>}
            {!searching && results.length === 0 && (
              <div className="wx-small">No US matches.</div>
            )}
            {results.map((r) => (
              <button key={r.id} className="wx-result" onClick={() => onAdd(r)}>
                <span>{r.name}</span>
                <span className="wx-small">{r.region}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <button
              className="wx-glass wx-row"
              onClick={onUseLocation}
              disabled={locating}
            >
              <span className="wx-row-left">
                <LocateFixed size={18} aria-hidden="true" />
                {locating ? "Finding you…" : "Use my location"}
              </span>
            </button>

            {places.map((p, i) => {
              const pv = previews[p.id];
              const pScene = pv ? sceneFor(pv.code, pv.isDay) : null;
              return (
                <div
                  key={p.id}
                  className={`wx-glass wx-place-card${i === selected ? " current" : ""}${
                    pScene
                      ? ` tint-${pScene.kind}-${pScene.isDay ? "day" : "night"}`
                      : ""
                  }`}
                >
                  <button className="wx-place-main" onClick={() => onSelect(i)}>
                    <div>
                      <div className="wx-place-name">
                        {p.isLocation && (
                          <LocateFixed size={14} aria-hidden="true" />
                        )}{" "}
                        {p.name}
                      </div>
                      <div className="wx-small">
                        {pv ? codeLabel(pv.code, pv.isDay) : p.region}
                      </div>
                    </div>
                    <div className="wx-place-temp">
                      {pv ? `${Math.round(pv.temp)}°` : ""}
                    </div>
                  </button>
                  {editing && (
                    <button
                      className="wx-icon-btn wx-remove"
                      onClick={() => onRemove(p.id)}
                      aria-label={`Remove ${p.name}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

export default WeatherTool;
