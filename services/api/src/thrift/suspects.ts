import { quantile, type ThriftListing } from "@lifehub/shared";

const BUNDLE = /\b(lot|lots|bundle|wholesale|bulk|for parts|parts only)\b/i;
const KIDS = /\b(kids?|youth|toddler|baby|infant|boys|girls|junior)\b/i;
/** A price this many times above or below the middle is likely another item. */
const OUTLIER = 3;

/**
 * Flags listings that are probably not the same item, so the estimate leaves
 * them out until the user puts them back: lots and bundles, kids' sizes
 * (unless that's what was searched), and prices far from the rest.
 */
export function markSuspects(
  listings: ThriftListing[],
  query: string,
): ThriftListing[] {
  const wantsKids = KIDS.test(query);
  const wantsBundle = BUNDLE.test(query);
  const middle = quantile(
    listings
      .filter(
        (l) =>
          (wantsBundle || !BUNDLE.test(l.title)) &&
          (wantsKids || !KIDS.test(l.title)),
      )
      .map((l) => l.price),
    0.5,
  );

  return listings.map((l) => {
    const suspect =
      !wantsBundle && BUNDLE.test(l.title)
        ? "Looks like a lot or bundle"
        : !wantsKids && KIDS.test(l.title)
          ? "Looks like a kids' size"
          : middle !== null && l.price > middle * OUTLIER
            ? "Priced far above the rest"
            : middle !== null && l.price < middle / OUTLIER
              ? "Priced far below the rest"
              : undefined;
    return suspect ? { ...l, suspect } : l;
  });
}
