/** A saved place. The current-location entry refreshes itself on open. */
export type Place = {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  isLocation?: boolean;
};

export type SceneKind =
  "clear" | "partly" | "cloudy" | "fog" | "rain" | "storm" | "snow";

/** Which background simulation (sky gradient + canvas) to run. */
export type Scene = { kind: SceneKind; isDay: boolean; intensity: number };

export type CurrentConditions = {
  time: string | undefined;
  temp: number | null;
  feels: number | null;
  humidity: number | null;
  dewPoint: number | null;
  isDay: boolean;
  code: number;
  cloud: number | null;
  windSpeed: number | null;
  windDir: number | null;
  windGusts: number | null;
  pressureInHg: number | null;
  uv: number | null;
  precipNow: number;
};

export type HourForecast = {
  time: string;
  temp: number | null;
  pop: number | null;
  code: number | null;
  isDay: boolean;
};

export type DayForecast = {
  date: string;
  code: number | null;
  hi: number | null;
  lo: number | null;
  pop: number | null;
  sum: number | null;
  sunrise: string | null;
  sunset: string | null;
  uv: number | null;
};

export type Nowcast = { values: number[]; text: string | null };

export type Forecast = {
  timezone: string;
  current: CurrentConditions;
  hourly: HourForecast[];
  daily: DayForecast[];
  nowcast: Nowcast;
  updatedAt: number;
};

export type WeatherAlert = {
  id: string;
  event: string;
  headline: string;
  severity: string | undefined;
  ends: string | undefined;
  description: string;
  instruction: string | null | undefined;
  sender: string;
};

/** Everything the main screen shows for one place. */
export type PlaceWeather = { forecast: Forecast; alerts: WeatherAlert[] };

/** Lightweight current conditions for a row in the places list. */
export type PlacePreview = { temp: number; code: number; isDay: boolean };
