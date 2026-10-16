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

/** The word added to the search when no detail is given. */
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

/**
 * The resale search for an item: the brand plus the detail, or the item kind
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

/** One sold Poshmark listing behind an estimate. */
export type ThriftListing = {
  id: string;
  title: string;
  /** The listed price when it sold, in USD. An accepted offer may be lower. */
  price: number;
  size?: string;
  condition?: string;
  imageUrl?: string;
  url: string;
  soldAt?: string;
  /**
   * Why the server thinks this may not be the same item (a lot, kids' sizes,
   * a price far from the rest). Left out of the estimate until put back.
   */
  suspect?: string;
};

export type ThriftLookup = {
  query: string;
  fetchedAt: string;
  listings: ThriftListing[];
};
