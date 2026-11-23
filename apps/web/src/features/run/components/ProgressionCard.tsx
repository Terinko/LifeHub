import type { Dashboard } from "../lib/dashboard";
import { formatDuration, formatPace, formatWhole } from "../lib/units";
import { REFERENCE_HR } from "../lib/settings";
import card from "./card.module.css";
import { Sparkline } from "./Sparkline";
import t from "./training.module.css";

type Item = {
  label: string;
  value: string;
  change: string;
  better: boolean;
  values: number[];
  lowerIsBetter?: boolean;
  tone: "run" | "lift";
};

const signed = (n: number, unit: string) =>
  `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(Math.round(n))}${unit}`;

/** Small trends for the numbers that show progress, since the trend window began. */
export function ProgressionCard({
  progression,
}: {
  progression: Dashboard["progression"];
}) {
  const items: Item[] = [];
  const pace = progression.easyPace;
  const p0 = pace[0];
  const p1 = pace.at(-1);
  if (p0 && p1 && pace.length > 1)
    items.push({
      label: `Easy pace near ${REFERENCE_HR} bpm`,
      value: formatPace(p1.pace),
      change: signed(p1.pace - p0.pace, " s"),
      better: p1.pace < p0.pace,
      values: pace.map((p) => p.pace),
      lowerIsBetter: true,
      tone: "run",
    });
  const half = progression.half;
  if (half)
    items.push({
      label: "Half marathon predicted",
      value: formatDuration(half.seconds),
      change:
        half.change === 0
          ? "steady"
          : `${half.change > 0 ? "−" : "+"}${formatDuration(Math.abs(half.change))}`,
      better: half.change > 0,
      values: half.trend,
      lowerIsBetter: true,
      tone: "run",
    });
  for (const [label, points] of [
    ["Bench est. 1RM (lb)", progression.bench],
    ["Row est. 1RM (lb)", progression.row],
  ] as const) {
    const a = points[0];
    const b = points.at(-1);
    if (a && b && points.length > 1)
      items.push({
        label,
        value: formatWhole(b.lb),
        change: signed(b.lb - a.lb, ""),
        better: b.lb > a.lb,
        values: points.map((p) => p.lb),
        tone: "lift",
      });
  }
  return (
    <section className={card.card}>
      <div className={card.head}>
        <h2 className={card.title}>Progression</h2>
        <span className={t.small}>last 16 weeks</span>
      </div>
      {items.length === 0 ? (
        <p className={t.empty}>
          Trends show up after a few weeks of runs and lifts.
        </p>
      ) : (
        <div className={t.grid2}>
          {items.map((item) => (
            <div key={item.label} className={t.inset}>
              <span className={t.small}>{item.label}</span>
              <span>
                <span className={t.tileValue}>{item.value}</span>{" "}
                <span className={item.better ? t.good : t.small}>
                  {item.change}
                </span>
              </span>
              <Sparkline
                values={item.values}
                lowerIsBetter={item.lowerIsBetter}
                tone={item.tone}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
