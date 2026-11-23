import type { MaxPoint } from "../lib/lifting";
import { formatWhole } from "../lib/units";
import card from "./card.module.css";
import { Sparkline } from "./Sparkline";
import t from "./training.module.css";

type Props = { maxes: { exercise: string; points: MaxPoint[] }[] };

/** Estimated 1-rep max for each tracked lift over the last 16 weeks. */
export function MaxCard({ maxes }: Props) {
  return (
    <section className={card.card}>
      <div className={card.head}>
        <h2 className={card.title}>Estimated 1-rep max</h2>
        <span className={t.small}>lb, last 16 weeks</span>
      </div>
      <div className={t.grid2}>
        {maxes.map(({ exercise, points }) => {
          const first = points[0];
          const last = points.at(-1);
          const change = first && last ? Math.round(last.lb - first.lb) : 0;
          return (
            <div key={exercise} className={t.inset}>
              <span className={t.small}>
                {exercise}
                {exercise === "Weighted pull-up" ? " (added)" : ""}
              </span>
              {last ? (
                <>
                  <span>
                    <span className={t.tileValue}>{formatWhole(last.lb)}</span>{" "}
                    <span className={change > 0 ? t.good : t.small}>
                      {change > 0 ? "+" : change < 0 ? "−" : "±"}
                      {Math.abs(change)}
                    </span>
                  </span>
                  <Sparkline values={points.map((p) => p.lb)} tone="lift" />
                </>
              ) : (
                <span className={t.small}>No sets logged yet</span>
              )}
            </div>
          );
        })}
      </div>
      <p className={card.note}>
        Estimated from your best set each session (weight and reps), so you
        never have to test a true max.
      </p>
    </section>
  );
}
