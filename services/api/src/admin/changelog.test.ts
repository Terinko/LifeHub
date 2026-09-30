import { describe, expect, it } from "vitest";
import { unseenChangelog, type ChangelogEntry } from "./changelog";

const entry = (id: string, date: string, tools?: string[]): ChangelogEntry => ({
  id,
  date,
  tools,
  bullets: [id],
});

const entries = [
  entry("later", "2026-09-20", ["poker"]),
  entry("before-launch", "2026-09-01"),
  entry("everyone", "2026-09-10"),
  entry("no-tools", "2026-09-12", []),
  entry("kitchen", "2026-09-15", ["kitchen"]),
];
const ids = (list: ChangelogEntry[]) => list.map((e) => e.id);

describe("unseenChangelog", () => {
  it("starts from the launch epoch when never dismissed, oldest first", () => {
    expect(
      ids(unseenChangelog({ pk: "p", permissions: { poker: true } }, entries)),
    ).toEqual(["everyone", "no-tools", "later"]);
  });

  it("hides entries dated on or before the last dismissal", () => {
    const profile = {
      pk: "p",
      lastSeenChangelogAt: "2026-09-12T00:00:00.000Z",
      permissions: { poker: true, kitchen: true },
    };
    expect(ids(unseenChangelog(profile, entries))).toEqual([
      "kitchen",
      "later",
    ]);
  });

  it("shows admins every tool's entries", () => {
    expect(ids(unseenChangelog({ pk: "p", role: "ADMIN" }, entries))).toEqual([
      "everyone",
      "no-tools",
      "kitchen",
      "later",
    ]);
  });

  it("treats any truthy permission as having the tool", () => {
    expect(
      ids(unseenChangelog({ pk: "p", permissions: { kitchen: 1 } }, entries)),
    ).toContain("kitchen");
    expect(
      ids(
        unseenChangelog({ pk: "p", permissions: { kitchen: false } }, entries),
      ),
    ).not.toContain("kitchen");
  });

  it("reads the bundled changelog.json by default", () => {
    const all = unseenChangelog({ pk: "p", role: "ADMIN" });
    expect(all.length).toBeGreaterThan(0);
    for (const e of all) {
      expect(e).toEqual({
        id: expect.any(String),
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        tools: expect.any(Array),
        bullets: expect.any(Array),
      });
    }
  });
});
