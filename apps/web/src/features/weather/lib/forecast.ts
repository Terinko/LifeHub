import type {
  CurrentConditions,
  DayForecast,
  Forecast,
  HourForecast,
} from "../types";
import { blend, pick, type ModelBlock } from "./blend";
import { adjustDailyCode } from "./codes";
import { describeNowcast } from "./nowcast";

/** The multi-model response (`models=` the blend). */
export type OpenMeteoForecast = {
  timezone: string;
  current?: {
    time?: string;
    temperature_2m?: number | null;
    apparent_temperature?: number | null;
    relative_humidity_2m?: number | null;
    dew_point_2m?: number | null;
    is_day?: number | null;
    weather_code?: number | null;
    cloud_cover?: number | null;
    wind_speed_10m?: number | null;
    wind_direction_10m?: number | null;
    wind_gusts_10m?: number | null;
  };
  hourly: ModelBlock;
  daily: ModelBlock;
};

/** The default-blend response that fills in UV, pressure and the nowcast. */
export type OpenMeteoExtras = {
  current?: {
    pressure_msl?: number | null;
    uv_index?: number | null;
    precipitation?: number | null;
  };
  daily?: { uv_index_max?: (number | null)[] };
  minutely_15?: { precipitation?: number[] };
};

const HOURS_SHOWN = 24;

function shapeHourly(main: OpenMeteoForecast): HourForecast[] {
  const h = main.hourly;
  const currentHour = (main.current?.time || h.time[0] || "").slice(0, 13);
  let start = h.time.findIndex((t) => t >= `${currentHour}:00`);
  if (start < 0) start = 0;

  const hourly: HourForecast[] = [];
  for (let i = start; i < Math.min(start + HOURS_SHOWN, h.time.length); i++) {
    hourly.push({
      time: h.time[i] ?? "",
      temp: blend(h, "temperature_2m", i),
      pop: pick(h, "precipitation_probability", i),
      code: pick(h, "weather_code", i),
      isDay: pick(h, "is_day", i) === 1,
    });
  }
  return hourly;
}

function shapeDaily(
  main: OpenMeteoForecast,
  extras: OpenMeteoExtras | null,
): DayForecast[] {
  const d = main.daily;
  return d.time.map((date, i) => {
    const sum = pick(d, "precipitation_sum", i);
    return {
      date,
      code: adjustDailyCode(pick(d, "weather_code", i), sum),
      hi: blend(d, "temperature_2m_max", i),
      lo: blend(d, "temperature_2m_min", i),
      pop: pick(d, "precipitation_probability_max", i),
      sum,
      sunrise: pick<string>(d, "sunrise", i),
      sunset: pick<string>(d, "sunset", i),
      uv: extras?.daily?.uv_index_max?.[i] ?? null,
    };
  });
}

// `current` isn't split per model; fall back to the hourly blend if the
// primary model has no value for this point.
function shapeCurrent(
  main: OpenMeteoForecast,
  extras: OpenMeteoExtras | null,
  firstHour: HourForecast | undefined,
): CurrentConditions {
  const c = main.current || {};
  const x = extras?.current;
  return {
    time: c.time,
    temp: c.temperature_2m ?? firstHour?.temp ?? null,
    feels: c.apparent_temperature ?? null,
    humidity: c.relative_humidity_2m ?? null,
    dewPoint: c.dew_point_2m ?? null,
    isDay: (c.is_day ?? (firstHour?.isDay ? 1 : 0)) === 1,
    code: c.weather_code ?? firstHour?.code ?? 0,
    cloud: c.cloud_cover ?? null,
    windSpeed: c.wind_speed_10m ?? null,
    windDir: c.wind_direction_10m ?? null,
    windGusts: c.wind_gusts_10m ?? null,
    pressureInHg: x?.pressure_msl ? x.pressure_msl * 0.02953 : null,
    uv: x?.uv_index ?? null,
    precipNow: x?.precipitation ?? 0,
  };
}

/** Turns the two Open-Meteo responses into what the screen shows. */
export function shapeForecast(
  main: OpenMeteoForecast,
  extras: OpenMeteoExtras | null,
  now = Date.now(),
): Forecast {
  const hourly = shapeHourly(main);
  const current = shapeCurrent(main, extras, hourly[0]);
  const values = extras?.minutely_15?.precipitation?.slice(0, 8) ?? [];
  return {
    timezone: main.timezone,
    current,
    hourly,
    daily: shapeDaily(main, extras),
    nowcast: {
      values,
      text: describeNowcast(values, current.precipNow, current.code),
    },
    updatedAt: now,
  };
}
