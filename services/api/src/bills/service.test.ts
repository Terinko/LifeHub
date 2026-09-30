import { describe, expect, it } from "vitest";
import { buildBill, toClientBill } from "./service";

const now = "2026-09-30T12:00:00.000Z";
const newId = () => "new-id";

describe("buildBill", () => {
  it("keeps every field sent, trims the name and sets the keys", () => {
    expect(
      buildBill(
        "u1",
        { name: " Rent ", amount: 1450, autopay: true },
        undefined,
        now,
        newId,
      ),
    ).toEqual({
      name: "Rent",
      amount: 1450,
      autopay: true,
      pk: "USER#u1#BILL",
      sk: "new-id",
      id: "new-id",
      billId: "new-id",
      updatedAt: now,
    });
  });

  it("picks the id from the path, then sk, id and billId", () => {
    const body = { name: "A", sk: "s", id: "i", billId: "b" };
    expect(buildBill("u1", body, "p", now, newId).sk).toBe("p");
    expect(buildBill("u1", body, undefined, now, newId).sk).toBe("s");
    expect(
      buildBill(
        "u1",
        { name: "A", id: "i", billId: "b" },
        undefined,
        now,
        newId,
      ).sk,
    ).toBe("i");
    expect(buildBill("u1", { name: "A", billId: "b" }, "", now, newId).sk).toBe(
      "b",
    );
  });

  it("never keeps a pk the client sent", () => {
    expect(
      buildBill("u1", { name: "A", pk: "BILL" }, undefined, now, newId).pk,
    ).toBe("USER#u1#BILL");
  });
});

describe("toClientBill", () => {
  it("hides the partition key and fills id and billId", () => {
    expect(toClientBill({ pk: "USER#u1#BILL", sk: "a", name: "Rent" })).toEqual(
      {
        pk: "BILL",
        sk: "a",
        id: "a",
        billId: "a",
        name: "Rent",
      },
    );
  });

  it("reads the key of older items from id or billId", () => {
    expect(toClientBill({ pk: "x", id: "old" })).toMatchObject({
      id: "old",
      billId: "old",
    });
    expect(toClientBill({ pk: "x", billId: "older" })).toMatchObject({
      id: "older",
      billId: "older",
    });
  });
});
