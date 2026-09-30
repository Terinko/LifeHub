import { describe, expect, it } from "vitest";
import {
  clockLabel,
  compass,
  dayLabel,
  hourLabel,
  minutesAgo,
  round,
  uvLabel,
} from "./format";

describe("format", () => {
  it("rounds or shows a placeholder", () => {
    expect(round(71.6)).toBe(72);
    expect(round(null)).toBe("--");
    expect(round(undefined)).toBe("--");
  });

  it("labels hours and clock times in 12-hour form", () => {
    expect(hourLabel("2026-09-30T00:00")).toBe("12AM");
    expect(hourLabel("2026-09-30T12:00")).toBe("12PM");
    expect(hourLabel("2026-09-30T15:00")).toBe("3PM");
    expect(clockLabel("2026-09-30T06:58")).toBe("6:58 AM");
    expect(clockLabel("2026-09-30T18:47")).toBe("6:47 PM");
    expect(clockLabel(null)).toBe("--");
  });

  it("names days", () => {
    expect(dayLabel("2026-09-30", 0)).toBe("Today");
    expect(dayLabel("2026-10-01", 1)).toBe("Thu");
  });

  it("turns bearings into compass points", () => {
    expect(compass(0)).toBe("N");
    expect(compass(200)).toBe("SSW");
    expect(compass(355)).toBe("N");
    expect(compass(null)).toBe("");
  });

  it("describes UV", () => {
    expect(uvLabel(2)).toBe("Low");
    expect(uvLabel(5)).toBe("Moderate");
    expect(uvLabel(7)).toBe("High");
    expect(uvLabel(10)).toBe("Very high");
    expect(uvLabel(11)).toBe("Extreme");
    expect(uvLabel(null)).toBe("");
  });

  it("counts whole minutes since an update", () => {
    expect(minutesAgo(10 * 60000 + 29000, 0)).toBe(10);
    expect(minutesAgo(0, 5000)).toBe(0);
  });
});
