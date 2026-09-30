import { describe, expect, it } from "vitest";
import { noPermissions, togglePermission } from "./permissions";

describe("togglePermission", () => {
  it("flips one tool and keeps the rest", () => {
    expect(togglePermission({ bills: true, poker: false }, "poker")).toEqual({
      bills: true,
      poker: true,
    });
    expect(togglePermission(noPermissions(), "bills").bills).toBe(true);
  });

  it("turns a missing tool on, even without any permissions yet", () => {
    expect(togglePermission({ bills: true }, "weather")).toEqual({
      bills: true,
      weather: true,
    });
    expect(togglePermission(undefined, "kitchen")).toEqual({ kitchen: true });
  });
});
