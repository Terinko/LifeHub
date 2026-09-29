import type { Bill, Payer } from "../types";
import { round2 } from "./money";

export const isSplit = (bill: Bill) =>
  !!bill.isShared && (bill.payers?.length ?? 0) > 0;

export type Shares = {
  mine: number;
  payers: { payer: Payer; share: number }[];
};

/**
 * Who owes what of one payment. People with a set share owe that; everyone
 * else, you included, splits the rest evenly. Rounding lands on your share.
 */
export function sharesOf(bill: Bill, amount: number): Shares {
  if (!isSplit(bill)) return { mine: amount, payers: [] };
  const payers = bill.payers ?? [];
  const fixed = payers.reduce((sum, p) => sum + (p.share ?? 0), 0);
  const evenCount = payers.filter((p) => p.share == null).length + 1;
  const even = Math.max(0, (amount - fixed) / evenCount);
  const list = payers.map((payer) => ({
    payer,
    share: round2(payer.share ?? even),
  }));
  const mine = round2(amount - list.reduce((sum, p) => sum + p.share, 0));
  return { mine, payers: list };
}

export const repaid = (payer: Payer, key: string) => !!payer.paidHistory?.[key];
