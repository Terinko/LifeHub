import type { TrendPoint } from "../../lib/poll";
import styles from "./RankTrend.module.css";

const W = 320;
const H = 110;
const TOP = 12;
const BOTTOM = 84;
/** Unranked weeks sit on a line just below #20. */
const NR = 23;

const y = (rank: number | null) =>
  TOP + (((rank ?? NR) - 1) / (NR - 1)) * (BOTTOM - TOP);

/** The team's poll rank week by week; #1 at the top. */
export function RankTrend({
  points,
  team,
}: {
  points: TrendPoint[];
  team: string;
}) {
  const step = points.length > 1 ? (W - 60) / (points.length - 1) : 0;
  const x = (i: number) => 24 + i * step;
  const path = points.map((p, i) => `${x(i)},${y(p.rank)}`).join(" ");
  const summary = points
    .map((p) => `${p.label}: ${p.rank ? `#${p.rank}` : "not ranked"}`)
    .join(", ");

  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${team} poll rank by week. ${summary}`}
    >
      {[1, 10, 20].map((r) => (
        <g key={r}>
          <line
            x1={0}
            x2={W - 26}
            y1={y(r)}
            y2={y(r)}
            className={styles.grid}
          />
          <text x={W - 2} y={y(r) + 4} className={styles.axis} textAnchor="end">
            {r}
          </text>
        </g>
      ))}
      <line
        x1={0}
        x2={W - 26}
        y1={y(null)}
        y2={y(null)}
        className={styles.nr}
      />
      <text x={W - 2} y={y(null) + 4} className={styles.axis} textAnchor="end">
        NR
      </text>
      {points.length > 1 && <polyline points={path} className={styles.line} />}
      {points.map((p, i) => (
        <g key={i}>
          <circle
            cx={x(i)}
            cy={y(p.rank)}
            r={i === points.length - 1 ? 5 : 4}
            className={i === points.length - 1 ? styles.now : styles.dot}
          />
          {(points.length <= 8 ||
            i % 2 === points.length % 2 ||
            i === points.length - 1) && (
            <text
              x={x(i)}
              y={H - 4}
              className={styles.axis}
              textAnchor="middle"
            >
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
