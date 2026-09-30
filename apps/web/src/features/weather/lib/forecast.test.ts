import { describe, expect, it } from "vitest";
import { avg, blend, pick, type ModelBlock } from "./blend";
import {
  shapeForecast,
  type OpenMeteoExtras,
  type OpenMeteoForecast,
} from "./forecast";

const hours = ["2026-09-30T13:00", "2026-09-30T14:00", "2026-09-30T15:00"];

const main: OpenMeteoForecast = {
  timezone: "America/New_York",
  current: {
    time: "2026-09-30T14:15",
    temperature_2m: 71,
    apparent_temperature: 70,
    relative_humidity_2m: 55,
    is_day: 1,
    weather_code: 2,
    wind_speed_10m: 8,
  },
  hourly: {
    time: hours,
    temperature_2m_ncep_nbm_conus: [68, 70, 72],
    temperature_2m_icon_seamless: [70, 72, null],
    temperature_2m_ecmwf_ifs025: [null, 74, 76],
    precipitation_probability_ncep_nbm_conus: [null, 10, 40],
    precipitation_probability_icon_seamless: [5, 20, 30],
    weather_code_ncep_nbm_conus: [1, 2, 61],
    is_day_ncep_nbm_conus: [1, 1, 1],
  },
  daily: {
    time: ["2026-09-30", "2026-10-01"],
    weather_code_ncep_nbm_conus: [61, 3],
    temperature_2m_max_ncep_nbm_conus: [75, 70],
    temperature_2m_max_icon_seamless: [77, 72],
    temperature_2m_min_ncep_nbm_conus: [60, 55],
    precipitation_sum_ncep_nbm_conus: [0.02, 0.3],
    precipitation_probability_max_ncep_nbm_conus: [30, 70],
    sunrise_ncep_nbm_conus: ["2026-09-30T06:58", "2026-10-01T06:59"],
    sunset_ncep_nbm_conus: ["2026-09-30T18:47", "2026-10-01T18:45"],
  },
};

const extras: OpenMeteoExtras = {
  current: { pressure_msl: 1015, uv_index: 4.2, precipitation: 0 },
  daily: { uv_index_max: [6.1, 3] },
  minutely_15: { precipitation: [0, 0, 0, 0, 0, 0, 0, 0, 0.5] },
};

describe("blend helpers", () => {
  const block: ModelBlock = {
    time: ["t"],
    x_ncep_nbm_conus: [null],
    x_icon_seamless: [4],
    x_ecmwf_ifs025: [6],
  };

  it("averages the models that have a value", () => {
    expect(blend(block, "x", 0)).toBe(5);
    expect(avg([null, undefined, Number.NaN])).toBeNull();
  });

  it("picks the first model with a value, in preference order", () => {
    expect(pick(block, "x", 0)).toBe(4);
    expect(pick(block, "missing", 0)).toBeNull();
  });
});

describe("shapeForecast", () => {
  const f = shapeForecast(main, extras, 123);

  it("starts the hourly list at the current hour and blends temperatures", () => {
    expect(f.hourly.map((h) => h.time)).toEqual(hours.slice(1));
    expect(f.hourly[0]).toEqual({
      time: "2026-09-30T14:00",
      temp: 72,
      pop: 10,
      code: 2,
      isDay: true,
    });
    expect(f.hourly[1]?.temp).toBe(74);
  });

  it("applies the rain rule and blends each day", () => {
    expect(f.daily[0]).toMatchObject({ code: 3, hi: 76, lo: 60, uv: 6.1 });
    expect(f.daily[1]).toMatchObject({ code: 61, hi: 71, pop: 70 });
    expect(f.daily[0]?.sunrise).toBe("2026-09-30T06:58");
  });

  it("fills current conditions from both responses", () => {
    expect(f.current).toMatchObject({
      temp: 71,
      feels: 70,
      isDay: true,
      code: 2,
      windGusts: null,
      uv: 4.2,
      precipNow: 0,
    });
    expect(f.current.pressureInHg).toBeCloseTo(29.97, 2);
  });

  it("keeps eight nowcast slots and describes them", () => {
    expect(f.nowcast).toEqual({
      values: [0, 0, 0, 0, 0, 0, 0, 0],
      text: "No rain expected for the next 2 hours",
    });
    expect(f.updatedAt).toBe(123);
  });

  it("falls back to the hourly blend without current data or extras", () => {
    const bare = shapeForecast({ ...main, current: undefined }, null);
    expect(bare.current).toMatchObject({
      temp: 69,
      isDay: true,
      code: 1,
      pressureInHg: null,
      uv: null,
    });
    expect(bare.hourly).toHaveLength(3);
    expect(bare.nowcast).toEqual({ values: [], text: null });
    expect(bare.daily[0]?.uv).toBeNull();
  });
});
