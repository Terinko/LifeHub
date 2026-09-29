import { describe, expect, it } from "vitest";
import { payoutText, venmoUrl } from "./share";

describe("share", () => {
  it("prefills a Venmo payment", () => {
    const url = new URL(venmoUrl(20, "Poker Sat, Sep 26"));
    expect(url.searchParams.get("txn")).toBe("pay");
    expect(url.searchParams.get("amount")).toBe("20.00");
    expect(url.searchParams.get("note")).toBe("Poker Sat, Sep 26");
  });

  it("writes the payouts for the group chat", () => {
    const text = payoutText("2026-09-26T23:00:00", [
      { from: "Jordan", fromId: "j", to: "Sam", toId: "s", amount: 20 },
    ]);
    expect(text).toBe("Poker, Sat, Sep 26\nJordan pays Sam $20.00");
    expect(payoutText("2026-09-26T23:00:00", [])).toContain(
      "Everyone broke even.",
    );
  });
});
