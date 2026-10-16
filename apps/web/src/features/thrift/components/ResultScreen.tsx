import type {
  ThriftEstimate,
  ThriftItemType,
  ThriftLookup,
  ThriftVerdict,
} from "@lifehub/shared";
import { ebaySoldUrl, poshmarkSoldUrl } from "../lib/links";
import {
  confidence,
  estimateText,
  howText,
  VERDICT_WORDS,
  verdictLine,
} from "../lib/present";
import { PriceScale } from "./PriceScale";
import styles from "../thrift.module.css";

type Props = {
  data: ThriftLookup;
  brand: string;
  itemType: ThriftItemType;
  detail: string;
  brandFromTag: boolean;
  estimate: ThriftEstimate;
  verdict: ThriftVerdict | null;
  tag: number | null;
  tagInput: string;
  onTagInput: (value: string) => void;
  onEdit: () => void;
  onEvidence: () => void;
  onHow: () => void;
  onNext: () => void;
};

/** The verdict first, then the estimate and how it was made, then the ways to check. */
export function ResultScreen(props: Props) {
  const { data, estimate, verdict, tag } = props;
  const conf = confidence(estimate, props.brandFromTag);
  const total = data.listings.length;

  return (
    <>
      <div className={styles.idLine}>
        <div>
          <div className={styles.sec}>
            {props.brand} · {props.itemType}
          </div>
          <h2>{[props.brand, props.detail].filter(Boolean).join(" ")}</h2>
        </div>
        <button type="button" className={styles.textBtn} onClick={props.onEdit}>
          Edit
        </button>
      </div>

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

      <div
        className={`${styles.verdict} ${verdict ? styles[verdict] : styles.pending}`}
        aria-live="polite"
      >
        <div className={styles.word}>
          {verdict ? VERDICT_WORDS[verdict] : "Enter the tag price"}
        </div>
        <div>{verdictLine(verdict, tag, estimate)}</div>
      </div>

      {estimate.low !== null && (
        <div className={styles.estimate}>
          <div className={styles.label}>Likely sells for</div>
          <div className={`${styles.big} ${styles.num}`}>
            {estimateText(estimate)}
          </div>
          <span className={styles.pill}>From real Poshmark sales</span>
          <PriceScale estimate={estimate} tag={tag} />
          <p className={styles.how}>
            {howText(estimate)}{" "}
            <button
              type="button"
              className={styles.textBtn}
              style={{ padding: 0 }}
              onClick={props.onHow}
            >
              How this works
            </button>
          </p>
        </div>
      )}

      <div className={styles.confidence}>
        <span className={styles.label}>Confidence</span>
        <span>
          <b>{conf.level}:</b> {conf.why}.
        </span>
      </div>

      {total > 0 && (
        <button
          type="button"
          className={styles.main}
          onClick={props.onEvidence}
        >
          See the {total} sale{total === 1 ? "" : "s"}
        </button>
      )}
      <a
        className={total > 0 ? styles.quiet : styles.main}
        href={poshmarkSoldUrl(data.query)}
        target="_blank"
        rel="noopener noreferrer"
      >
        See these sales on Poshmark ↗
      </a>
      <a
        className={styles.textBtn}
        style={{ textAlign: "center" }}
        href={ebaySoldUrl(data.query)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Double-check eBay's sold listings ↗
      </a>

      {estimate.low === null && (
        <button type="button" className={styles.quiet} onClick={props.onEdit}>
          Broaden the search
        </button>
      )}

      <div className={styles.card}>
        <span className={styles.label}>Original retail</span>
        <p style={{ margin: "4px 0 0" }}>Unknown</p>
      </div>

      <button type="button" className={styles.quiet} onClick={props.onNext}>
        Scan the next item
      </button>
    </>
  );
}
