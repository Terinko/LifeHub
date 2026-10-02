import { describe, expect, it } from "vitest";
import { venmoUrl } from "./share";

describe("share", () => {
  it("prefills a Venmo payment", () => {
    const url = new URL(venmoUrl(20, "Poker Sat, Sep 26"));
    expect(url.searchParams.get("txn")).toBe("pay");
    expect(url.searchParams.get("amount")).toBe("20.00");
    expect(url.searchParams.get("note")).toBe("Poker Sat, Sep 26");
  });
});
