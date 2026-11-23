import { shortDate } from "../lib/dates";
import { LOAD_BAND, ratioTone, type RatioPoint } from "../lib/load";
import card from "./card.module.css";
import styles from "./LoadCard.module.css";
import t from "./training.module.css";

const TOP = 1.8;
const BOTTOM = 0.4;
const W = 356;
const H = 150;
const LEFT = 28;

const y = (r: number) =>
  10 + ((TOP - Math.min(TOP, Math.max(BOTTOM, r))) / (TOP - BOTTOM)) * (H - 30);

const TONE_TEXT = { balanced: "balanced", high: "spike", low: "easing off" };

/** This week's load against the 4-week average, runs and lifts together. */
export function LoadCard({ points }: { points: RatioPoint[] }) {
  const last = points.at(-1);
  if (!last || points.length < 2) {
    return (
      <section className={card.card}>
        <h2 className={card.title}>Training load</h2>
        <p className={t.empty}>
          This needs four weeks of training to compare against.
        </p>
      </section>
    );
  }
  const x = (i: number) => LEFT + (i / (points.length - 1)) * (W - LEFT - 4);
  const line = points
    .map((p, i) => `${x(i).toFixed(1)},${y(p.ratio).toFixed(1)}`)
    .join(" ");
  const tone = ratioTone(last.ratio);
  const first = points[0];
  return (
    <section className={card.card}>
      <div className={card.head}>
        <h2 className={card.title}>Training load</h2>
        <span className={t.pill} data-tone={tone}>
          {last.ratio.toFixed(2)} {TONE_TEXT[tone]}
        </span>
      </div>
      <p className={card.note}>
        The last 7 days against your 4-week average, runs and lifts combined.
        Staying in the {LOAD_BAND.low}–{LOAD_BAND.high} band builds fitness
        without a spike.
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={t.svg}
        role="img"
        aria-label={`Load ratio now ${last.ratio.toFixed(2)}`}
      >
        <rect
          x={LEFT}
          y={y(LOAD_BAND.high)}
          width={W - LEFT}
          height={y(LOAD_BAND.low) - y(LOAD_BAND.high)}
          className={styles.band}
        />
        <line x1={LEFT} x2={W} y1={y(1)} y2={y(1)} className={styles.one} />
        {[LOAD_BAND.high, 1, LOAD_BAND.low].map((r) => (
          <text key={r} x={0} y={y(r) + 4}>
            {r.toFixed(1)}
          </text>
        ))}
        <polyline points={line} className={styles.line} />
        {points.map((p, i) => (
          <circle
            key={p.day}
            cx={x(i)}
            cy={y(p.ratio)}
            r={i === points.length - 1 ? 4.5 : 3}
            className={styles.dot}
            data-tone={ratioTone(p.ratio)}
          />
        ))}
        {first && (
          <text x={LEFT} y={H - 4}>
            {shortDate(first.day)}
          </text>
        )}
        <text x={W} y={H - 4} textAnchor="end">
          Now
        </text>
      </svg>
    </section>
  );
}
