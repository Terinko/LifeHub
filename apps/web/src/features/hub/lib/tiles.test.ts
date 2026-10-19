import { describe, expect, it } from "vitest";
import { hubTiles } from "./tiles";

const keys = (...args: Parameters<typeof hubTiles>) =>
  hubTiles(...args).map((tile) => tile.key);

describe("hubTiles", () => {
  it("shows an admin every tool, then Applications and Admin", () => {
    expect(keys({ pk: "USER#1", role: "ADMIN" })).toEqual([
      "bills",
      "kitchen",
      "poker",
      "fantasy",
      "weather",
      "hockey",
      "applications",
      "admin",
    ]);
  });

  it("shows everyone else only the tools they were granted, in Hub order", () => {
    expect(
      keys({
        pk: "USER#2",
        role: "USER",
        permissions: { weather: true, bills: true, poker: false },
      }),
    ).toEqual(["bills", "weather"]);
  });

  it("never gives Poker Stats its own card", () => {
    expect(keys({ pk: "USER#3", permissions: { pokerStats: true } })).toEqual(
      [],
    );
  });

  it("shows nothing without a profile or permissions", () => {
    expect(keys(undefined)).toEqual([]);
    expect(keys({ pk: "USER#4", role: "USER" })).toEqual([]);
  });
});
