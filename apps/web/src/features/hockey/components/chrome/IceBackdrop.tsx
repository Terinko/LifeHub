import styles from "./IceBackdrop.module.css";

/**
 * Faint rink markings fixed behind the page (blue lines, the red center
 * line and center-ice circle), so the glass bars have something to frost.
 */
export function IceBackdrop() {
  return (
    <div className={styles.ice} aria-hidden>
      <span className={styles.blue} data-at="top" />
      <span className={styles.red} />
      <span className={styles.circle} />
      <span className={styles.blue} data-at="bottom" />
    </div>
  );
}
