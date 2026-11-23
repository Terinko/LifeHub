import { shiftDays, shortDate } from "../lib/dates";
import { paceGain, type PacePoint } from "../lib/easyPace";
import { PACE_BOX, paceChart } from "../lib/paceChart";
import { formatPace } from "../lib/units";
import card from "./card.module.css";
import styles from "./EasyPaceCard.module.css";

type Props = {
  points: PacePoint[];
  band: { low: number; high: number };
  first: string;
  weeks: number;
};

/** Weekly pace at the same easy heart rate: a falling line means fitter. */
export function EasyPaceCard({ points, band, first, weeks }: Props) {
  const gain = Math.round(paceGain(points));
  const title = `Easy-run pace at ${band.low}–${band.high} bpm`;
  const first0 = points[0];
  const last = points.at(-1);
  if (!first0 || !last || points.length < 2) {
    return (
      <section className={`${card.card} ${card.wide}`}>
        <h2 className={card.title}>{title}</h2>
        <p className={card.note}>
          Not enough easy runs with heart rate yet. This fills in after a couple
          of weeks of runs in that range.
        </p>
      </section>
    );
  }
  const chart = paceChart(points, first, weeks);
  const end = chart.points.at(-1) ?? { x: 0, y: 0 };
  const font = { fontFamily: "var(--log-font-num)", fontSize: 11 };
  return (
    <section className={`${card.card} ${card.wide} ${styles.pace}`}>
      <div className={card.head}>
        <h2 className={card.title}>{title}</h2>
        <span className={styles.gain} data-better={gain > 0 || undefined}>
          {gain === 0
            ? `Steady over ${weeks} weeks`
            : `${Math.abs(gain)} s/mi ${gain > 0 ? "faster" : "slower"} in ${weeks} weeks`}
        </span>
      </div>
      <p className={card.note}>
        Same heart rate, quicker pace means your aerobic base is improving.
      </p>
      <svg
        viewBox="0 0 560 180"
        role="img"
        aria-label={`Easy pace went from ${formatPace(first0.pace)} to ${formatPace(last.pace)} per mile`}
        className={styles.svg}
      >
        {chart.ticks.map((t, i) => (
          <g key={t.pace}>
            <line
              x1={PACE_BOX.left}
              x2={548}
              y1={t.y}
              y2={t.y}
              className={
                i === chart.ticks.length - 1 ? styles.axis : styles.grid
              }
            />
            <text
              x={34}
              y={t.y + 4}
              textAnchor="end"
              className={styles.label}
              style={font}
            >
              {formatPace(t.pace)}
            </text>
          </g>
        ))}
        <text x={PACE_BOX.left} y={172} className={styles.label} style={font}>
          {shortDate(first)}
        </text>
        <text
          x={PACE_BOX.right}
          y={172}
          textAnchor="end"
          className={styles.label}
          style={font}
        >
          {shortDate(shiftDays(first, (weeks - 1) * 7))}
        </text>
        <polygon points={chart.area} className={styles.area} />
        <polyline points={chart.line} className={styles.line} />
        <circle cx={end.x} cy={end.y} r={5} className={styles.dot} />
        <text
          x={end.x - 6}
          y={end.y - 12}
          textAnchor="end"
          className={styles.value}
          style={{ ...font, fontSize: 12 }}
        >
          {formatPace(last.pace)}/mi
        </text>
      </svg>
    </section>
  );
}
