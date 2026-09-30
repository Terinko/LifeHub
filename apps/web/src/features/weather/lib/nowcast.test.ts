import { describe, expect, it } from "vitest";
import { describeNowcast, hasNowcastRain, nowcastBarHeight } from "./nowcast";

const dry = [0, 0, 0, 0, 0, 0, 0, 0];

describe("describeNowcast", () => {
  it("returns nothing without data", () => {
    expect(describeNowcast([], 0, 0)).toBeNull();
  });

  it("reports a dry two hours", () => {
    expect(describeNowcast(dry, 0, 0)).toBe(
      "No rain expected for the next 2 hours",
    );
  });

  it("says when rain starts", () => {
    expect(describeNowcast([0, 0, 0.02, 0.03, 0, 0, 0, 0], 0, 3)).toBe(
      "Rain starting in about 30 min",
    );
  });

  it("says when rain ends", () => {
    expect(describeNowcast([0.02, 0.01, 0, 0, 0, 0, 0, 0], 0, 61)).toBe(
      "Rain ending in about 30 min",
    );
  });

  it("counts a wet weather code as raining now", () => {
    expect(describeNowcast(dry, 0, 53)).toBe("Rain ending shortly");
    expect(
      describeNowcast([0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01], 0, 0),
    ).toBe("Rain continuing for the next 2 hours");
  });

  it("doesn't treat snow codes as rain", () => {
    expect(describeNowcast(dry, 0, 73)).toBe(
      "No rain expected for the next 2 hours",
    );
  });

  it("counts precipitation falling right now", () => {
    expect(describeNowcast(dry, 0.02, 0)).toBe("Rain ending shortly");
  });
});

describe("nowcast bars", () => {
  it("only draws bars when some slot is wet", () => {
    expect(hasNowcastRain(dry)).toBe(false);
    expect(hasNowcastRain([0, 0.006])).toBe(true);
  });

  it("scales bar height from 3px up to 33px", () => {
    expect(nowcastBarHeight(0)).toBe(3);
    expect(nowcastBarHeight(0.04)).toBe(18);
    expect(nowcastBarHeight(0.5)).toBe(33);
  });
});
