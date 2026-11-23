import type { RacePrediction } from "../lib/running";
import { formatDuration } from "../lib/units";
import card from "./card.module.css";
import { Sparkline } from "./Sparkline";
import t from "./training.module.css";

/** Predicted race times from VO2 max, and how far each moved in 16 weeks. */
export function RaceCard({
  races,
  vo2,
}: {
  races: RacePrediction[];
  vo2: number | undefined;
}) {
  return (
    <section className={card.card}>
      <div>
        <h2 className={card.title}>Race predictions</h2>
        <p className={card.note}>
          {vo2
            ? `From your VO₂ max (${vo2}). The line is the last 16 weeks.`
            : "These appear once Garmin has a VO₂ max for you."}
        </p>
      </div>
      <div className={t.rows}>
        {races.map((r) => (
          <div key={r.label} className={t.row}>
            <div className={t.rowMain}>
              <span className={t.rowTitle}>{r.label}</span>
              <span className={r.change > 0 ? t.good : t.small}>
                {r.change === 0
                  ? "steady"
                  : `${r.change > 0 ? "−" : "+"}${formatDuration(Math.abs(r.change))} in 16 weeks`}
              </span>
            </div>
            <div style={{ width: 72 }}>
              <Sparkline values={r.trend} lowerIsBetter tone="run" />
            </div>
            <span className={`${t.num} ${t.rowTitle}`}>
              {formatDuration(r.seconds)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
