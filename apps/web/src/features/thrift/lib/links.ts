/**
 * Terapeak (Seller Hub > Research): eBay's own sold prices for the last 90
 * days, including accepted offers. Free for anyone with an eBay seller account.
 */
export const terapeakUrl = (query: string) =>
  `https://www.ebay.com/sh/research?${new URLSearchParams({
    marketplace: "EBAY-US",
    keywords: query,
    dayRange: "90",
    tabName: "SOLD",
  }).toString()}`;

/** eBay search with the Sold filter on, for people without Seller Hub. */
export const ebaySoldUrl = (query: string) =>
  `https://www.ebay.com/sch/i.html?${new URLSearchParams({
    _nkw: query,
    LH_Sold: "1",
    LH_Complete: "1",
  }).toString()}`;
