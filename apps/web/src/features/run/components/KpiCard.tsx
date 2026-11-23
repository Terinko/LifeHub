import type { Kpi } from "../lib/kpis";
import card from "./card.module.css";
import styles from "./KpiCard.module.css";

/** One summary number with its goal bar and a line of context. */
export function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <div className={`${card.card} ${styles.kpi}`}>
      <div className={styles.top}>
        <span className={card.kicker}>{kpi.label}</span>
        <span className={styles.pill} data-tone={kpi.tone}>
          {kpi.pill}
        </span>
      </div>
      <div className={styles.figure}>
        <span className={`${card.num} ${styles.value}`}>{kpi.value}</span>
        <span className={styles.unit}>{kpi.unit}</span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${kpi.percent}%` }} />
      </div>
      <span className={styles.note}>{kpi.note}</span>
    </div>
  );
}
