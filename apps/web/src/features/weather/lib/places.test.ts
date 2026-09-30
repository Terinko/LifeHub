import { describe, expect, it } from "vitest";
import type { Place } from "../types";
import {
  clampSelection,
  findSamePlace,
  nameFromPoint,
  shapePreviews,
  shapeSearchResults,
  swipeStep,
  upsertCurrentLocation,
} from "./places";

const city = (id: string, lat = 0, lon = 0): Place => ({
  id,
  name: id,
  region: "",
  lat,
  lon,
});
const here: Place = {
  id: "loc-40.000,-75.000",
  name: "Philadelphia",
  region: "PA",
  lat: 40,
  lon: -75,
  isLocation: true,
};

describe("upsertCurrentLocation", () => {
  it("adds the location first and selects it when there is none", () => {
    expect(upsertCurrentLocation([city("nyc")], here)).toEqual({
      places: [here, city("nyc")],
      selectIndex: 0,
    });
  });

  it("replaces an existing location in place without changing selection", () => {
    const old = { ...here, id: "loc-old", name: "Old" };
    expect(upsertCurrentLocation([city("nyc"), old], here)).toEqual({
      places: [city("nyc"), here],
      selectIndex: null,
    });
  });
});

describe("findSamePlace", () => {
  const saved = [city("a", 40, -75), city("b", 41, -74)];

  it("matches a place within about a kilometre", () => {
    expect(findSamePlace(saved, city("x", 41.005, -74.009))).toBe(1);
  });

  it("returns -1 for a new place", () => {
    expect(findSamePlace(saved, city("x", 40.02, -75))).toBe(-1);
  });
});

describe("clampSelection", () => {
  it("keeps the index inside the list", () => {
    expect(clampSelection(3, 2)).toBe(1);
    expect(clampSelection(-1, 2)).toBe(0);
    expect(clampSelection(1, 3)).toBe(1);
  });

  it("falls back to 0 for an empty list", () => {
    expect(clampSelection(2, 0)).toBe(0);
  });
});

describe("swipeStep", () => {
  it("moves to the next place on a swipe left and back on a swipe right", () => {
    expect(swipeStep(-80, 5)).toBe(1);
    expect(swipeStep(80, 5)).toBe(-1);
  });

  it("ignores short or mostly vertical swipes", () => {
    expect(swipeStep(-50, 0)).toBe(0);
    expect(swipeStep(-80, 60)).toBe(0);
  });
});

describe("shapeSearchResults", () => {
  it("maps geocoder results to places", () => {
    expect(
      shapeSearchResults({
        results: [
          {
            id: 7,
            name: "Austin",
            admin1: "Texas",
            latitude: 30,
            longitude: -97,
          },
          { id: 8, name: "Nowhere", latitude: 1, longitude: 2 },
        ],
      }),
    ).toEqual([
      { id: "geo-7", name: "Austin", region: "Texas", lat: 30, lon: -97 },
      { id: "geo-8", name: "Nowhere", region: "", lat: 1, lon: 2 },
    ]);
  });

  it("handles no results", () => {
    expect(shapeSearchResults({})).toEqual([]);
  });
});

describe("nameFromPoint", () => {
  it("uses the NWS relative location", () => {
    const json = {
      properties: {
        relativeLocation: { properties: { city: "Camden", state: "NJ" } },
      },
    };
    expect(nameFromPoint(json)).toEqual({ name: "Camden", region: "NJ" });
  });

  it("falls back to a generic name", () => {
    expect(nameFromPoint({})).toEqual({ name: "My location", region: "" });
  });
});

describe("shapePreviews", () => {
  const places = [city("a"), city("b")];

  it("pairs each response with its place and skips missing temperatures", () => {
    expect(
      shapePreviews(places, [
        { current: { temperature_2m: 61.4, weather_code: 3, is_day: 1 } },
        { current: { temperature_2m: null, weather_code: 0, is_day: 0 } },
      ]),
    ).toEqual({ a: { temp: 61.4, code: 3, isDay: true } });
  });

  it("accepts a single-place response that isn't an array", () => {
    expect(
      shapePreviews([city("a")], {
        current: { temperature_2m: 50, weather_code: 0, is_day: 0 },
      }),
    ).toEqual({ a: { temp: 50, code: 0, isDay: false } });
  });
});
