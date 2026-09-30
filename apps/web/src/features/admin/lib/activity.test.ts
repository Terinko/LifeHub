import { describe, expect, it } from "vitest";
import { countActiveThisWeek, formatRelative } from "./activity";

const NOW = new Date("2026-09-20T12:00:00Z").getTime();
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const MIN = 60_000;
const DAY = 24 * 60 * MIN;

describe("formatRelative", () => {
  it("says never without a time", () => {
    expect(formatRelative(undefined, NOW)).toBe("never");
  });

  it("counts minutes, hours and days", () => {
    expect(formatRelative(ago(30_000), NOW)).toBe("just now");
    expect(formatRelative(ago(5 * MIN), NOW)).toBe("5m ago");
    expect(formatRelative(ago(3 * 60 * MIN), NOW)).toBe("3h ago");
    expect(formatRelative(ago(29 * DAY), NOW)).toBe("29d ago");
  });

  it("shows the date after a month", () => {
    const iso = ago(40 * DAY);
    expect(formatRelative(iso, NOW)).toBe(new Date(iso).toLocaleDateString());
  });
});

describe("countActiveThisWeek", () => {
  it("counts users seen in the last seven days", () => {
    const users = [
      { pk: "a", lastActiveAt: ago(DAY) },
      { pk: "b", lastActiveAt: ago(7 * DAY + MIN) },
      { pk: "c" },
      { pk: "d", lastActiveAt: ago(6 * DAY) },
    ];
    expect(countActiveThisWeek(users, NOW)).toBe(2);
  });
});
