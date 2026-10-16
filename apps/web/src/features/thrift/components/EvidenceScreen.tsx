import type {
  ThriftEstimate,
  ThriftListing,
  ThriftLookup,
  ThriftVerdict,
} from "@lifehub/shared";
import { estimateText, money, VERDICT_WORDS } from "../lib/present";
import styles from "../thrift.module.css";

type Props = {
  data: ThriftLookup;
  estimate: ThriftEstimate;
  verdict: ThriftVerdict | null;
  excluded: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onBack: () => void;
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const day = (iso: string | undefined) => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? dateFmt.format(new Date(t)) : undefined;
};

/** Every sale behind the estimate; "Not a match" recalculates on the spot. */
export function EvidenceScreen({
  data,
  estimate,
  verdict,
  excluded,
  onToggle,
  onBack,
}: Props) {
  const sales = [...data.listings].sort((a, b) => a.price - b.price);
  const dates = data.listings
    .map((l) => l.soldAt)
    .filter((d): d is string => !!d)
    .sort();
  const first = day(dates[0]);
  const last = day(dates.at(-1));

  const row = (l: ThriftListing) => {
    const out = excluded.has(l.id);
    const meta = [
      l.size && `size ${l.size}`,
      l.condition,
      day(l.soldAt) && `sold ${day(l.soldAt)}`,
    ]
      .filter(Boolean)
      .join(" · ");
    // Outline the middle half, the sales the estimate is made of.
    const middle =
      !out &&
      estimate.low !== null &&
      estimate.high !== null &&
      l.price >= estimate.low &&
      l.price <= estimate.high;
    return (
      <div
        key={l.id}
        className={`${styles.item} ${out ? styles.out : ""} ${middle ? styles.lowQuarter : ""}`}
      >
        {l.imageUrl ? (
          <img
            className={styles.thumb}
            src={l.imageUrl}
            alt=""
            loading="lazy"
          />
        ) : (
          <div className={styles.thumb} />
        )}
        <div style={{ minWidth: 0 }}>
          <a
            className={styles.title}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {l.title}
          </a>
          <div className={styles.meta}>{meta}</div>
          {l.suspect && <div className={styles.why}>{l.suspect}</div>}
        </div>
        <div className={styles.price}>
          {money(l.price)}
          <button
            type="button"
            className={styles.toggle}
            aria-pressed={out}
            onClick={() => onToggle(l.id)}
          >
            {out ? "Put back" : "Not a match"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div>
        <div className={styles.label}>Sold on Poshmark</div>
        <p className={styles.sec}>
          Recent sales for “{data.query}”
          {first && last && first !== last && `, sold ${first} to ${last}`}.
          Each price is what it was listed at when it sold. Tap a title to open
          it on Poshmark.
        </p>
      </div>

      <div className={styles.summary}>
        <div className={styles.card}>
          <div className={styles.sec}>Likely sells for</div>
          <div className={styles.summaryValue}>{estimateText(estimate)}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.sec}>Verdict</div>
          <div className={styles.summaryValue}>
            {verdict ? VERDICT_WORDS[verdict] : "No tag price"}
          </div>
        </div>
      </div>

      <div className={styles.label}>Cheapest first · middle half outlined</div>
      {sales.length ? (
        <div className={styles.list}>{sales.map(row)}</div>
      ) : (
        <p className={styles.sec}>No sales match this search.</p>
      )}

      <p className={styles.sec}>
        If you plan to resell, Poshmark keeps 20% of sales over $15.
      </p>
      <button type="button" className={styles.quiet} onClick={onBack}>
        Back to the verdict
      </button>
    </>
  );
}
