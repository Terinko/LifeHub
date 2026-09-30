import { randomUUID } from "node:crypto";
import * as repo from "./repository";
import type { BillItem } from "./repository";

/** The client never sees the real partition key, only "BILL". */
export function toClientBill(item: BillItem): BillItem {
  const itemKey = item.sk || item.id || item.billId;
  return { ...item, pk: "BILL", id: itemKey, billId: itemKey };
}

/** The stored item for a create or a full replace. */
export function buildBill(
  userId: string,
  body: Record<string, unknown>,
  pathId: string | undefined,
  now: string,
  newId: () => string = randomUUID,
): BillItem {
  const itemKey = pathId || body.sk || body.id || body.billId || newId();
  return {
    ...body,
    name: (body.name as string).trim(),
    pk: repo.partitionKey(userId),
    sk: itemKey,
    id: itemKey,
    billId: itemKey,
    updatedAt: now,
  };
}

export async function listBills(userId: string): Promise<BillItem[]> {
  return (await repo.listBills(userId)).map(toClientBill);
}

export async function saveBill(
  userId: string,
  body: Record<string, unknown>,
  pathId: string | undefined,
): Promise<BillItem> {
  const bill = buildBill(userId, body, pathId, new Date().toISOString());
  await repo.putBill(bill);
  return { ...bill, pk: "BILL" };
}

export const deleteBill = repo.deleteBill;
