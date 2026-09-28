import { describe, expect, it } from "vitest";
import { formatAge, isStale } from "./age";

const now = new Date("2026-09-28T12:00:00Z").getTime();

describe("formatAge", () => {
  it.each([
    ["2026-09-28T08:00:00Z", "today"],
    ["2026-09-27T11:00:00Z", "1 day ago"],
    ["2026-09-14T12:00:00Z", "14 days ago"],
  ])("%s -> %s", (date, expected) => {
    expect(formatAge(date, now)).toBe(expected);
  });
});

describe("isStale", () => {
  it("is false at exactly 14 days and true after", () => {
    expect(isStale("2026-09-14T12:00:00Z", now)).toBe(false);
    expect(isStale("2026-09-14T11:59:00Z", now)).toBe(true);
  });
});
