import { z } from "zod";

/** The item kinds the lookup offers as one-tap chips. */
export const THRIFT_ITEM_TYPES = [
  "Coat or jacket",
  "Sweater or fleece",
  "Shirt or top",
  "Jeans or pants",
  "Dress or skirt",
  "Shoes",
  "Bag",
  "Other",
] as const;
export type ThriftItemType = (typeof THRIFT_ITEM_TYPES)[number];

/** The word added to the eBay search when no detail is given. */
const TYPE_WORDS: Record<ThriftItemType, string> = {
  "Coat or jacket": "jacket",
  "Sweater or fleece": "sweater",
  "Shirt or top": "shirt",
  "Jeans or pants": "pants",
  "Dress or skirt": "dress",
  Shoes: "shoes",
  Bag: "bag",
  Other: "",
};

export const thriftLookupSchema = z.object({
  brand: z.string().trim().min(1, "Add the brand").max(60),
  itemType: z.enum(THRIFT_ITEM_TYPES),
  detail: z.string().trim().max(60).default(""),
});
export type ThriftLookupInput = z.input<typeof thriftLookupSchema>;

/** What someone saw on Terapeak or eBay's Sold filter, saved to calibrate. */
export const thriftSaleSchema = z.object({
  itemType: z.enum(THRIFT_ITEM_TYPES),
  query: z.string().trim().min(1).max(200),
  /** The cheapest-quarter asking price the app showed. */
  ceiling: z.number().positive().max(100_000),
  /** The average sold price they typed in. */
  sold: z.number().positive("Type what they sold for").max(100_000),
});
export type ThriftSaleInput = z.input<typeof thriftSaleSchema>;

/**
 * The eBay search for an item: the brand plus the detail, or the item kind
 * when there's no detail. Lower case, single spaces.
 */
export function thriftQuery(input: {
  brand: string;
  itemType: ThriftItemType;
  detail?: string;
}): string {
  const rest = input.detail?.trim() || TYPE_WORDS[input.itemType];
  return [input.brand, rest]
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** One current eBay listing behind an estimate. */
export type ThriftListing = {
  id: string;
  title: string;
  /** Asking price, or the current bid on an auction, in USD. */
  price: number;
  shipping?: number;
  kind: "fixed" | "auction";
  /** Auctions only. */
  bids?: number;
  endsAt?: string;
  condition?: string;
  imageUrl?: string;
  url: string;
  listedAt?: string;
  /**
   * Why the server thinks this may not be the same item (a lot, kids' sizes,
   * a price far from the rest). Left out of the estimate until put back.
   */
  suspect?: string;
};

/** How far below asking prices this kind of item sold, from people's checks. */
export type ThriftCalibration = {
  /** Median of sold price ÷ cheapest-quarter asking price. */
  ratio: number;
  checks: number;
};

export type ThriftLookup = {
  query: string;
  fetchedAt: string;
  listings: ThriftListing[];
  calibration: ThriftCalibration | null;
};
