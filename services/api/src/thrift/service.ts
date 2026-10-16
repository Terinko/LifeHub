import {
  thriftQuery,
  type ThriftItemType,
  type ThriftLookup,
} from "@lifehub/shared";
import { cached } from "../shared/cache";
import { HttpError } from "../shared/http";
import { ebayConfigured, searchAuctions, searchFixedPrice } from "./ebay";
import { getCalibration, saveSale, takeLookup } from "./repository";
import { markSuspects } from "./suspects";

// Short enough that prices stay current (eBay's license allows listing data
// up to 6 hours old), long enough that a re-run after an edit is free.
const LISTINGS_TTL = 15 * 60 * 1000;

export async function lookup(
  userId: string,
  input: { brand: string; itemType: ThriftItemType; detail: string },
): Promise<ThriftLookup> {
  if (!ebayConfigured()) {
    throw new HttpError(503, "eBay isn't connected to LifeHub yet.");
  }
  await takeLookup(userId);

  const query = thriftQuery(input);
  const [fixed, auctions, calibration] = await Promise.all([
    cached(`fixed:${query}`, LISTINGS_TTL, () => searchFixedPrice(query)),
    cached(`auctions:${query}`, LISTINGS_TTL, () => searchAuctions(query)),
    getCalibration(input.itemType),
  ]);

  return {
    query,
    fetchedAt: new Date().toISOString(),
    listings: markSuspects([...auctions, ...fixed], query),
    calibration,
  };
}

export const recordSale = saveSale;
