import { describe, expect, it } from "vitest";
import { adjustDailyCode, codeLabel, sceneFor, sceneKey } from "./codes";

describe("codeLabel", () => {
  it("names WMO codes", () => {
    expect(codeLabel(63)).toBe("Rain");
    expect(codeLabel(96)).toBe("Thunderstorms with hail");
  });

  it("says night for clear skies after dark", () => {
    expect(codeLabel(0, false)).toBe("Clear night");
    expect(codeLabel(1, false)).toBe("Mostly clear");
    expect(codeLabel(0, true)).toBe("Clear");
  });

  it("shows a dash for unknown or missing codes", () => {
    expect(codeLabel(42)).toBe("—");
    expect(codeLabel(null)).toBe("—");
  });
});

describe("sceneFor", () => {
  it("picks the sky for each kind of weather", () => {
    expect(sceneFor(0, true)).toEqual({
      kind: "clear",
      isDay: true,
      intensity: 1,
    });
    expect(sceneFor(2, false).kind).toBe("partly");
    expect(sceneFor(3, true).kind).toBe("cloudy");
    expect(sceneFor(48, true).kind).toBe("fog");
    expect(sceneFor(95, true).kind).toBe("storm");
  });

  it("scales rain and snow intensity", () => {
    expect(sceneFor(61, true)).toMatchObject({ kind: "rain", intensity: 0.55 });
    expect(sceneFor(63, true)).toMatchObject({ kind: "rain", intensity: 1 });
    expect(sceneFor(82, true)).toMatchObject({ kind: "rain", intensity: 2 });
    expect(sceneFor(71, true)).toMatchObject({ kind: "snow", intensity: 0.6 });
    expect(sceneFor(73, true)).toMatchObject({ kind: "snow", intensity: 1 });
    expect(sceneFor(86, true)).toMatchObject({ kind: "snow", intensity: 2 });
  });

  it("builds the sky key", () => {
    expect(sceneKey(sceneFor(65, false))).toBe("rain-night");
  });
});

describe("adjustDailyCode", () => {
  it("downgrades a wet day with under 0.10 in of rain", () => {
    expect(adjustDailyCode(61, 0.02)).toBe(3);
    expect(adjustDailyCode(80, null)).toBe(2);
    expect(adjustDailyCode(95, 0.05)).toBe(2);
  });

  it("upgrades a dry day with 0.10 in or more", () => {
    expect(adjustDailyCode(3, 0.2)).toBe(61);
    expect(adjustDailyCode(1, 0.5)).toBe(63);
  });

  it("leaves snow, agreeing forecasts and missing codes alone", () => {
    expect(adjustDailyCode(73, 0)).toBe(73);
    expect(adjustDailyCode(63, 0.4)).toBe(63);
    expect(adjustDailyCode(2, 0)).toBe(2);
    expect(adjustDailyCode(null, 1)).toBeNull();
  });
});
