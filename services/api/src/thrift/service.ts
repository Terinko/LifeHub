import {
  thriftQuery,
  type ThriftItemType,
  type ThriftLookup,
} from "@lifehub/shared";
import { cached } from "../shared/cache";
import { searchSold } from "./poshmark";
import { takeLookup } from "./repository";
import { markSuspects } from "./suspects";

// Sales don't change by the minute, and a re-run after an edit is free.
const SALES_TTL = 30 * 60 * 1000;

export async function lookup(
  userId: string,
  input: { brand: string; itemType: ThriftItemType; detail: string },
): Promise<ThriftLookup> {
  await takeLookup(userId);
  const query = thriftQuery(input);
  const listings = await cached(`sold:${query}`, SALES_TTL, () =>
    searchSold(query),
  );
  return {
    query,
    fetchedAt: new Date().toISOString(),
    listings: markSuspects(listings, query),
  };
}
