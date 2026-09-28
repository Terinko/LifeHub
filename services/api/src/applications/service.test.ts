import { describe, expect, it } from "vitest";
import { saveApplicationSchema } from "@lifehub/shared";
import { buildApplication } from "./service";

const now = "2026-09-28T12:00:00.000Z";

describe("buildApplication", () => {
  it("fills defaults for a new card", () => {
    const input = saveApplicationSchema.parse({
      company: "  Acme ",
      position: "Engineer",
      status: "Ghosted",
    });

    expect(buildApplication("u1", input, now, () => "new-id")).toEqual({
      pk: "USER#u1#APPLICATION",
      sk: "new-id",
      company: "Acme",
      position: "Engineer",
      location: "",
      status: "Applied",
      dateApplied: "2026-09-28",
      url: "",
      source: "",
      salaryRange: "",
      contact: "",
      notes: "",
      createdAt: now,
      updatedAt: now,
    });
  });

  it("keeps the id and created date when editing", () => {
    const input = saveApplicationSchema.parse({
      sk: "abc",
      company: "Acme",
      position: "Engineer",
      createdAt: "2026-01-01T00:00:00.000Z",
      dateApplied: "2026-01-02",
    });

    const item = buildApplication("u1", input, now);
    expect(item).toMatchObject({
      sk: "abc",
      createdAt: "2026-01-01T00:00:00.000Z",
      dateApplied: "2026-01-02",
      updatedAt: now,
    });
  });

  it("rejects a blank company or position", () => {
    expect(
      saveApplicationSchema.safeParse({ company: " ", position: "x" }).success,
    ).toBe(false);
  });
});
