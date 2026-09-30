// Model blending. A 60-day backtest against airport observations at six US
// stations (Sep 2026) found that averaging NBM + ICON + ECMWF beat every
// single model on temperature.

export const BLEND_MODELS = ["ncep_nbm_conus", "icon_seamless", "ecmwf_ifs025"];

type Value = number | string | null;

/** An Open-Meteo hourly/daily block with one `<field>_<model>` array per model. */
export type ModelBlock = { time: string[] } & {
  [series: string]: Value[] | undefined;
};

export function avg(values: (number | null | undefined)[]): number | null {
  const v = values.filter((x): x is number => x != null && !Number.isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/** First non-null value across models, in preference order. */
export function pick<T extends Value = number>(
  block: ModelBlock,
  field: string,
  i: number,
): T | null {
  for (const m of BLEND_MODELS) {
    const value = block[`${field}_${m}`]?.[i];
    if (value != null) return value as T;
  }
  return null;
}

/** Average of every model that has a value. */
export const blend = (block: ModelBlock, field: string, i: number) =>
  avg(BLEND_MODELS.map((m) => block[`${field}_${m}`]?.[i] as number | null));
