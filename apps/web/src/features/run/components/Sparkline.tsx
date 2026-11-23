import styles from "./training.module.css";

type Props = {
  values: number[];
  /** Draws smaller values higher (paces and race times). */
  lowerIsBetter?: boolean;
  tone: "run" | "lift";
};

/** A small trend line with no axes. */
export function Sparkline({ values, lowerIsBetter, tone }: Props) {
  if (values.length < 2) return <div className={styles.spark} />;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const points = values
    .map((v, i) => {
      let t = hi === lo ? 0.5 : (v - lo) / (hi - lo);
      if (lowerIsBetter) t = 1 - t;
      const x = (i / (values.length - 1)) * 100;
      return `${x.toFixed(1)},${(34 - t * 30).toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 36"
      preserveAspectRatio="none"
      className={styles.spark}
      data-c={tone}
      aria-hidden
    >
      <polyline points={points} />
    </svg>
  );
}
