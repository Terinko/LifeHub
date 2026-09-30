import { describe, expect, it } from "vitest";
import { nowMarker, rangeBar, tempColor, weekScale } from "./tempScale";

describe("tempColor", () => {
  it("clamps below and above the scale", () => {
    expect(tempColor(-10)).toBe("rgb(120,170,255)");
    expect(tempColor(20)).toBe("rgb(120,170,255)");
    expect(tempColor(120)).toBe("rgb(232,95,80)");
  });

  it("hits the stops and blends between them", () => {
    expect(tempColor(75)).toBe("rgb(247,200,115)");
    expect(tempColor(81.5)).toBe("rgb(245,175,103)");
  });
});

describe("range bars", () => {
  const pct = weekScale([
    { lo: 50, hi: 70 },
    { lo: 60, hi: 90 },
  ]);

  it("puts every day on the week's scale", () => {
    expect(pct(50)).toBe(0);
    expect(pct(90)).toBe(100);
    expect(pct(60)).toBe(25);
  });

  it("positions a day's bar with a 4% minimum width", () => {
    expect(rangeBar({ lo: 50, hi: 70 }, pct)).toMatchObject({
      left: "0%",
      width: "50%",
    });
    expect(rangeBar({ lo: 60, hi: 60 }, pct).width).toBe("4%");
  });

  it("clamps the now marker to the track", () => {
    expect(nowMarker(70, pct)).toBe("50%");
    expect(nowMarker(95, pct)).toBe("100%");
    expect(nowMarker(40, pct)).toBe("0%");
  });

  it("never divides by a zero-degree week", () => {
    expect(weekScale([{ lo: 60, hi: 60 }])(61)).toBe(100);
  });
});
