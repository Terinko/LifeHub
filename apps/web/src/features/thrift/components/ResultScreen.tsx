import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type {
  ThriftEstimate,
  ThriftItemType,
  ThriftLookup,
  ThriftVerdict,
} from "@lifehub/shared";
import { saveSale } from "../api";
import { ebaySoldUrl, terapeakUrl } from "../lib/links";
import {
  confidence,
  estimateText,
  howText,
  money,
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
  const [checkedSales, setCheckedSales] = useState(false);

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

      {estimate.kind !== "none" && (
        <div className={styles.estimate}>
          <div className={styles.label}>Likely sells for</div>
          <div className={`${styles.big} ${styles.num}`}>
            {estimateText(estimate)}
          </div>
          <span className={styles.pill}>
            {estimate.kind === "asking"
              ? "Asking prices, not sales"
              : "Estimate, not sold prices"}
          </span>
          <PriceScale estimate={estimate} tag={tag} />
          <p className={styles.how}>
            {howText(estimate, data.calibration, props.itemType)}{" "}
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
          className={styles.quiet}
          onClick={props.onEvidence}
        >
          See the {total} listing{total === 1 ? "" : "s"}
        </button>
      )}
      <a
        className={styles.main}
        href={terapeakUrl(data.query)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setCheckedSales(true)}
      >
        Check real sales in Terapeak ↗
      </a>
      <a
        className={styles.textBtn}
        style={{ textAlign: "center" }}
        href={ebaySoldUrl(data.query)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setCheckedSales(true)}
      >
        No seller account? eBay's Sold filter ↗
      </a>

      {checkedSales && estimate.ceiling !== null && (
        <SaleCheck
          itemType={props.itemType}
          query={data.query}
          ceiling={estimate.ceiling}
        />
      )}

      {estimate.kind === "none" && (
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

type SaleProps = { itemType: ThriftItemType; query: string; ceiling: number };

/** One optional question after Terapeak, which sharpens future estimates. */
function SaleCheck({ itemType, query, ceiling }: SaleProps) {
  const [value, setValue] = useState("");
  const save = useMutation({ mutationFn: saveSale });
  const sold = Number(value);

  if (save.isSuccess) {
    return (
      <div className={styles.card}>
        <span className={styles.label}>Saved</span>
        <p style={{ margin: "4px 0 0" }}>
          Thanks. Future estimates for items like this will use it.
        </p>
      </div>
    );
  }

  return (
    <form
      className={styles.card}
      style={{ display: "grid", gap: 10 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (sold > 0) save.mutate({ itemType, query, ceiling, sold });
      }}
    >
      <span className={styles.label}>Back from Terapeak?</span>
      <strong>What did they sell for?</strong>
      <p className={styles.sec}>
        Optional. Type the average sold price you saw. The cheapest asking price
        here was {money(ceiling)}.
      </p>
      <div className={styles.tagPrice}>
        <label htmlFor="thrift-sold">Average sold</label>
        <span className={styles.sticker}>
          $
          <input
            id="thrift-sold"
            inputMode="decimal"
            placeholder="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </span>
      </div>
      {save.isError && <p className={styles.sec}>{save.error.message}</p>}
      <button
        type="submit"
        className={styles.main}
        disabled={!(sold > 0) || save.isPending}
      >
        {save.isPending ? "Saving" : "Save"}
      </button>
    </form>
  );
}
