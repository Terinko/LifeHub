import { describe, expect, it } from "vitest";
import type { Application } from "@lifehub/shared";
import { groupByStatus } from "./board";

const app = (sk: string, status: Application["status"]) =>
  ({ sk, status }) as Application;

describe("groupByStatus", () => {
  it("returns every column, in order, even when empty", () => {
    const columns = groupByStatus([app("a", "Offer"), app("b", "Applied")]);
    expect(Object.keys(columns)).toEqual([
      "Applied",
      "Phone Screen",
      "Interview",
      "Offer",
      "Rejected",
      "Withdrawn",
    ]);
    expect(columns.Offer.map((a) => a.sk)).toEqual(["a"]);
    expect(columns.Interview).toEqual([]);
  });

  it("drops items with an unknown status instead of crashing", () => {
    const columns = groupByStatus([app("x", "Ghosted" as never)]);
    expect(Object.values(columns).flat()).toEqual([]);
  });
});
