import type { Settlement } from "../types";
import { formatMoney } from "./money";

export const gameDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

/**
 * Opens Venmo's pay screen with the amount and a note filled in. Venmo
 * handles aren't stored, so the payer picks who to send it to.
 */
export function venmoUrl(amount: number, note: string): string {
  const params = new URLSearchParams({
    txn: "pay",
    amount: amount.toFixed(2),
    note,
  });
  return `https://venmo.com/?${params.toString()}`;
}

/** The payouts as plain text for the group chat. */
export function payoutText(date: string, settlements: Settlement[]): string {
  const lines = settlements.map(
    (s) => `${s.from} pays ${s.to} ${formatMoney(s.amount)}`,
  );
  return [
    `Poker, ${gameDate(date)}`,
    ...(lines.length ? lines : ["Everyone broke even."]),
  ].join("\n");
}
