import { THRIFT_MIN_SALES } from "@lifehub/shared";
import styles from "../thrift.module.css";

/** How the estimate and verdict are worked out, in plain words. */
export function HowScreen({ onBack }: { onBack: () => void }) {
  return (
    <>
      <h2 style={{ margin: 0, fontSize: 20 }}>How the estimate works</h2>
      <ol className={styles.howList}>
        <li>
          <b>It finds recent sales.</b> The search reads Poshmark's sold
          listings for the brand and detail you gave, up to 48 of the newest.
        </li>
        <li>
          <b>It drops the likely mismatches.</b> Lots, kids' sizes and prices
          far from the rest are left out, and you can mark any other sale as not
          a match.
        </li>
        <li>
          <b>It takes the middle half.</b> "Likely sells for" runs from the
          cheapest quarter to the dearest quarter of what's left, so a few odd
          sales don't skew it.
        </li>
      </ol>
      <p className={styles.sec}>
        A Poshmark price is what the item was listed at when it sold. Buyers
        often make offers, so the real sale can be a little lower.
      </p>
      <div className={styles.card}>
        <span className={styles.label}>The verdict</span>
        <ul className={styles.howList} style={{ marginTop: 8 }}>
          <li>Good find: the tag is at most a third of the low end.</li>
          <li>Fair price: at most two thirds.</li>
          <li>Skip: more than that.</li>
          <li>
            Not sure: fewer than {THRIFT_MIN_SALES} matching sales, or prices
            too spread out to trust.
          </li>
        </ul>
      </div>
      <p className={styles.sec}>
        A photo can't confirm an item is genuine, and this tool doesn't try to.
      </p>
      <button type="button" className={styles.quiet} onClick={onBack}>
        Back to the verdict
      </button>
    </>
  );
}
