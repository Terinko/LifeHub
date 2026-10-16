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

function endsIn(iso: string | undefined) {
  if (!iso) return "";
  const hours = Math.round((Date.parse(iso) - Date.now()) / 3_600_000);
  if (!Number.isFinite(hours)) return "";
  if (hours < 1) return "ends within the hour";
  return `ends in ${hours}h`;
}

/** Every listing behind the estimate; "Not a match" recalculates on the spot. */
export function EvidenceScreen({
  data,
  estimate,
  verdict,
  excluded,
  onToggle,
  onBack,
}: Props) {
  const auctions = data.listings.filter((l) => l.kind === "auction");
  const fixed = data.listings
    .filter((l) => l.kind === "fixed")
    .sort((a, b) => a.price - b.price);
  const dates = fixed
    .map((l) => l.listedAt)
    .filter((d): d is string => !!d)
    .sort();
  const [firstDate] = dates;
  const lastDate = dates.at(-1);

  const row = (l: ThriftListing) => {
    const out = excluded.has(l.id);
    const meta =
      l.kind === "auction"
        ? `${l.bids ?? 0} bid${l.bids === 1 ? "" : "s"} · ${endsIn(l.endsAt)}`
        : [
            l.condition,
            l.listedAt && `listed ${dateFmt.format(new Date(l.listedAt))}`,
            l.shipping
              ? `+${money(l.shipping)} shipping`
              : l.shipping === 0
                ? "free shipping"
                : "",
          ]
            .filter(Boolean)
            .join(" · ");
    const low =
      l.kind === "fixed" &&
      !out &&
      estimate.ceiling !== null &&
      l.price <= estimate.ceiling;
    return (
      <div
        key={l.id}
        className={`${styles.item} ${out ? styles.out : ""} ${low ? styles.lowQuarter : ""}`}
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
        <div className={styles.label}>Asking prices, not sales</div>
        <p className={styles.sec}>
          Current eBay listings for “{data.query}”
          {firstDate &&
            lastDate &&
            firstDate !== lastDate &&
            `, listed ${dateFmt.format(new Date(firstDate))} to ${dateFmt.format(new Date(lastDate))}`}
          . Tap a title to open it on eBay.
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

      <div className={styles.label}>Live auctions with bids</div>
      {auctions.length ? (
        <div className={styles.list}>{auctions.map(row)}</div>
      ) : (
        <p className={styles.sec}>No live auctions with bids right now.</p>
      )}

      <div className={styles.label}>Buy It Now · cheapest quarter outlined</div>
      {fixed.length ? (
        <div className={styles.list}>{fixed.map(row)}</div>
      ) : (
        <p className={styles.sec}>No Buy It Now listings match.</p>
      )}

      <p className={styles.sec}>
        If you plan to resell, eBay takes roughly 13% when an item sells.
      </p>
      <button type="button" className={styles.quiet} onClick={onBack}>
        Back to the verdict
      </button>
    </>
  );
}
