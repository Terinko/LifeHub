import { describe, expect, it } from "vitest";
import { changelogTag } from "./changelog";

const entry = (tools?: string[]) => ({
  id: "x",
  date: "2026-09-08",
  tools,
  bullets: [],
});

describe("changelogTag", () => {
  it("calls an entry without tools General", () => {
    expect(changelogTag(entry())).toBe("General");
    expect(changelogTag(entry([]))).toBe("General");
  });

  it("lists the tools by name, keeping unknown keys as they are", () => {
    expect(changelogTag(entry(["poker", "pokerStats", "later"]))).toBe(
      "Poker, Poker Stats, later",
    );
  });
});
