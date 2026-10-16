import { useState } from "react";
import { ebaySoldUrl, poshmarkSoldUrl } from "../lib/links";
import { soldVerdict, VERDICT_WORDS } from "../lib/present";
import styles from "../thrift.module.css";

type Props = {
  title: string;
  subtitle: string;
  query: string;
  /** Why live listings aren't here, in one calm sentence. */
  reason: string;
  tag: number | null;
  tagInput: string;
  onTagInput: (value: string) => void;
  onEdit: () => void;
  onNext: () => void;
};

const amount = (value: string) => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * The verdict without the lookup: the person looks up real sales and types
 * the typical sold price, so every number is one they saw.
 */
export function SelfCheck(props: Props) {
  const [soldInput, setSoldInput] = useState("");
  const { verdict, line } = soldVerdict(props.tag, amount(soldInput));

  return (
    <>
      <div className={styles.idLine}>
        <div>
          <div className={styles.sec}>{props.subtitle}</div>
          <h2>{props.title}</h2>
        </div>
        <button type="button" className={styles.textBtn} onClick={props.onEdit}>
          Edit
        </button>
      </div>

      <p className={styles.sec}>{props.reason}</p>

      <div className={styles.tagPrice}>
        <label htmlFor="thrift-tag">Tag price</label>
        <span className={styles.sticker}>
          $
          <input
            id="thrift-tag"
            inputMode="decimal"
            placeholder="0"
            value={props.tagInput}
            onChange={(e) => props.onTagInput(e.target.value)}
          />
        </span>
      </div>

      <div className={styles.card} style={{ display: "grid", gap: 10 }}>
        <span className={styles.label}>1 · Look up real sales</span>
        <a
          className={styles.main}
          href={poshmarkSoldUrl(props.query)}
          target="_blank"
          rel="noopener noreferrer"
        >
          See sold listings on Poshmark ↗
        </a>
        <a
          className={styles.textBtn}
          style={{ textAlign: "center" }}
          href={ebaySoldUrl(props.query)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Or eBay's sold listings ↗
        </a>
      </div>

      <div className={styles.card} style={{ display: "grid", gap: 10 }}>
        <span className={styles.label}>2 · What did they sell for?</span>
        <p className={styles.sec} style={{ margin: 0 }}>
          Skip lots, kids' sizes and anything not quite the same. The middle of
          the recent sales is a good number.
        </p>
        <div className={styles.tagPrice}>
          <label htmlFor="thrift-sold">Typical sold price</label>
          <span className={styles.sticker}>
            $
            <input
              id="thrift-sold"
              inputMode="decimal"
              placeholder="0"
              value={soldInput}
              onChange={(e) => setSoldInput(e.target.value)}
            />
          </span>
        </div>
      </div>

      <div
        className={`${styles.verdict} ${verdict ? styles[verdict] : styles.pending}`}
        aria-live="polite"
      >
        <div className={styles.word}>
          {verdict ? VERDICT_WORDS[verdict] : "No verdict yet"}
        </div>
        <div>{line}</div>
      </div>

      <button type="button" className={styles.quiet} onClick={props.onNext}>
        Scan the next item
      </button>
    </>
  );
}
