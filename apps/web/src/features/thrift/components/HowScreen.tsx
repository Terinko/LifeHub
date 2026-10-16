import { THRIFT_MIN_CHECKS, THRIFT_MIN_LISTINGS } from "@lifehub/shared";
import styles from "../thrift.module.css";

/** How the estimate and verdict are worked out, in plain words. */
export function HowScreen({ onBack }: { onBack: () => void }) {
  return (
    <>
      <h2 style={{ margin: 0, fontSize: 20 }}>How the estimate works</h2>
      <p className={styles.sec}>
        eBay doesn't share sold prices with apps like this one, so the estimate
        comes from what's for sale right now, checked against real sales people
        in the group have looked up.
      </p>
      <ol className={styles.howList}>
        <li>
          <b>Live auctions with bids set the floor.</b> A bid is a real buyer's
          commitment, and the final price only goes up from there.
        </li>
        <li>
          <b>The cheapest quarter of Buy It Now listings sets the ceiling.</b> A
          buyer can always pay that, so similar items rarely sell above it.
        </li>
        <li>
          <b>The group's Terapeak checks fill the gap.</b> When there are no
          auctions, the estimate uses how far below asking prices this kind of
          item actually sold, once there are {THRIFT_MIN_CHECKS} checks. Before
          that it shows the asking price and says so.
        </li>
      </ol>
      <div className={styles.card}>
        <span className={styles.label}>The verdict</span>
        <ul className={styles.howList} style={{ marginTop: 8 }}>
          <li>Good find: the tag is at most a third of the low end.</li>
          <li>Fair price: at most two thirds.</li>
          <li>Skip: more than that.</li>
          <li>
            Not sure: fewer than {THRIFT_MIN_LISTINGS} matching listings and no
            auctions, or prices too spread out to trust.
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
