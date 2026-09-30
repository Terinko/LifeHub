import { describe, expect, it } from "vitest";
import { alertUntil, isSevere, shapeAlerts } from "./alerts";

const feature = (id: string, severity?: string, ends?: string | null) => ({
  properties: {
    id,
    event: `${id} event`,
    headline: "",
    severity,
    ends,
    expires: "2026-10-01T06:00:00-04:00",
    description: "",
    instruction: null,
    senderName: "NWS",
  },
});

describe("shapeAlerts", () => {
  it("sorts the most severe first", () => {
    const alerts = shapeAlerts({
      features: [
        feature("minor", "Minor"),
        feature("none"),
        feature("extreme", "Extreme"),
        feature("moderate", "Moderate"),
      ],
    });
    expect(alerts.map((a) => a.id)).toEqual([
      "extreme",
      "moderate",
      "minor",
      "none",
    ]);
  });

  it("uses the expiry when an alert has no end time", () => {
    const [a] = shapeAlerts({ features: [feature("a", "Minor", null)] });
    expect(a?.ends).toBe("2026-10-01T06:00:00-04:00");
  });

  it("handles no features", () => {
    expect(shapeAlerts({})).toEqual([]);
  });
});

describe("alert helpers", () => {
  const [severe, moderate] = shapeAlerts({
    features: [feature("s", "Severe"), feature("m", "Moderate")],
  });

  it("flags extreme and severe alerts", () => {
    expect(severe && isSevere(severe)).toBe(true);
    expect(moderate && isSevere(moderate)).toBe(false);
  });

  it("describes the end time, or nothing", () => {
    expect(moderate && alertUntil(moderate)).toMatch(/^Until .+ · $/);
    expect(moderate && alertUntil({ ...moderate, ends: undefined })).toBe("");
  });
});
