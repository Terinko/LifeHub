import type { Bill } from "../types";
import { addMonths, monthOf } from "./dates";
import { occurrencesIn } from "./schedule";
import { entryOf, type Entry } from "./status";

/** A bill's due dates before `beforeKey`, newest first, up to `limit`. */
export function pastEntries(
  bill: Bill,
  today: Date,
  beforeKey: string,
  limit = 12,
): Entry[] {
  const out: Entry[] = [];
  const now = monthOf(today);
  for (let i = 0; i < 36 && out.length < limit; i++) {
    const occs = occurrencesIn(bill, addMonths(now, -i)).reverse();
    for (const occ of occs)
      if (occ.key < beforeKey && out.length < limit)
        out.push(entryOf(bill, occ, today));
  }
  return out;
}
