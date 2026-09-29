import { describe, expect, it } from "vitest";
import type { Starter } from "@lifehub/shared";
import { initials, pairLineups, shortName } from "./lineup";

const s = (name: string, pos: Starter["pos"]): Starter => ({
  name,
  pos,
  team: "BUF",
  points: null,
  gameState: "pre",
});

describe("pairLineups", () => {
  it("lines players up by position and pads the shorter side", () => {
    const rows = pairLineups(
      [s("Kicker", "K"), s("Quarterback", "QB")],
      [s("Their QB", "QB"), s("Their RB", "RB"), s("Their K", "K")],
    );
    expect(rows.map((r) => [r.mine?.name, r.theirs?.name])).toEqual([
      ["Quarterback", "Their QB"],
      ["Kicker", "Their RB"],
      [undefined, "Their K"],
    ]);
  });
});

describe("initials", () => {
  it("uses the first letters of the first two words", () => {
    expect(initials("Tyler's Team")).toBe("TT");
    expect(initials("Waiver Wire Kings")).toBe("WW");
  });
});

describe("shortName", () => {
  it("abbreviates the first name and keeps defenses whole", () => {
    expect(shortName("Josh Allen")).toBe("J. Allen");
    expect(shortName("Kenneth Walker III")).toBe("K. Walker III");
    expect(shortName("PIT Defense")).toBe("PIT Defense");
  });
});
