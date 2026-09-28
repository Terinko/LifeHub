import { describe, expect, it } from "vitest";
import { upsertCurrentLocation, type Place } from "./currentLocation";

const city = (id: string): Place => ({
  id,
  name: id,
  region: "",
  lat: 0,
  lon: 0,
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
