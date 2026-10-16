import type { ThriftEstimate } from "@lifehub/shared";
import { money } from "../lib/present";
import styles from "../thrift.module.css";

type Props = { estimate: ThriftEstimate; tag: number | null };

/** Where the tag price sits against the likely sale range, on one scale. */
export function PriceScale({ estimate, tag }: Props) {
  if (estimate.low === null) return null;
  const high = estimate.high ?? estimate.low;
  const max = Math.max(high, tag ?? 0) * 1.25;
  const x = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  const width = Math.max(1.5, ((high - estimate.low) / max) * 100);

  return (
    <div className={styles.scale} aria-hidden>
      <div className={styles.track} />
      <div
        className={styles.band}
        style={{ left: x(estimate.low), width: `${width}%` }}
      />
      {tag !== null && tag > 0 && (
        <div className={styles.pin} style={{ left: x(tag) }}>
          Tag {money(tag)}
          <i />
        </div>
      )}
      <div className={styles.ends}>
        <span className={styles.num}>$0</span>
        <span className={styles.num}>{money(max)}</span>
      </div>
    </div>
  );
}
