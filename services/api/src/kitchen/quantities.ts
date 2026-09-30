import { convertUnit, round2, type ExtraQuantity } from "@lifehub/shared";

/** An item's main amount plus any extras that didn't convert into it. */
export type Amounts = { main: number; unit: string; extra: ExtraQuantity[] };

/**
 * Adds an amount. It folds into the main number when the units convert
 * (tbsp into cups), else into an extra of the same unit, else it becomes a
 * new extra, so nothing is lost or duplicated.
 */
export function addAmount(
  { main, unit, extra }: Amounts,
  quantity: number,
  addUnit: string,
): Amounts {
  const converted = convertUnit(quantity, addUnit, unit);
  if (converted !== null) {
    return { main: round2(main + converted), unit, extra };
  }
  const i = extra.findIndex(
    (e) => convertUnit(quantity, addUnit, e.unit) !== null,
  );
  if (i === -1) {
    return {
      main,
      unit,
      extra: [...extra, { quantity: round2(quantity), unit: addUnit }],
    };
  }
  return {
    main,
    unit,
    extra: extra.map((e, j) =>
      j === i
        ? {
            ...e,
            quantity: round2(
              e.quantity + (convertUnit(quantity, addUnit, e.unit) ?? 0),
            ),
          }
        : e,
    ),
  };
}

/**
 * Takes an amount away, from the main number or a matching extra, never
 * going under 0. Returns null when the units don't convert (slices out of
 * a loaf), so the caller can leave the pantry alone and say why.
 */
export function takeAmount(
  { main, unit, extra }: Amounts,
  quantity: number,
  takeUnit: string,
): Amounts | null {
  const fromMain = convertUnit(quantity, takeUnit, unit);
  if (fromMain !== null) {
    return { main: Math.max(0, round2(main - fromMain)), unit, extra };
  }
  const i = extra.findIndex(
    (e) => convertUnit(quantity, takeUnit, e.unit) !== null,
  );
  if (i === -1) return null;
  return {
    main,
    unit,
    extra: extra.map((e, j) =>
      j === i
        ? {
            ...e,
            quantity: Math.max(
              0,
              round2(
                e.quantity - (convertUnit(quantity, takeUnit, e.unit) ?? 0),
              ),
            ),
          }
        : e,
    ),
  };
}
