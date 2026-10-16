/** eBay search with the Sold filter on, for people without Seller Hub. */
export const ebaySoldUrl = (query: string) =>
  `https://www.ebay.com/sch/i.html?${new URLSearchParams({
    _nkw: query,
    LH_Sold: "1",
    LH_Complete: "1",
  }).toString()}`;

/** Poshmark's own sold search, the same one the lookup reads. */
export const poshmarkSoldUrl = (query: string) =>
  `https://poshmark.com/search?${new URLSearchParams({
    query,
    availability: "sold_out",
  })}`;
