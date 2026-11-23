import { formatHours, formatMiles, formatWhole } from "../lib/units";
import type { WeekTotals } from "../lib/week";
import card from "./card.module.css";
import t from "./training.module.css";

type Props = { now: WeekTotals; last: WeekTotals };

type Line = {
  label: string;
  last: string;
  now: string;
  delta: string;
};

const pct = (now: number, last: number) =>
  last === 0
    ? now === 0
      ? "—"
      : "new"
    : `${now >= last ? "+" : "−"}${Math.abs(Math.round(((now - last) / last) * 100))}%`;

const diff = (now: number, last: number) =>
  `${now >= last ? "+" : "−"}${Math.abs(now - last)}`;

/** This week so far against last week up to the same day. */
export function WeekCompare({ now, last }: Props) {
  const lines: Line[] = [
    {
      label: "Miles",
      last: formatMiles(last.miles),
      now: formatMiles(now.miles),
      delta: pct(now.miles, last.miles),
    },
    {
      label: "Lift sessions",
      last: String(last.lifts),
      now: String(now.lifts),
      delta: diff(now.lifts, last.lifts),
    },
    {
      label: "Working sets",
      last: String(last.sets),
      now: String(now.sets),
      delta: diff(now.sets, last.sets),
    },
    {
      label: "Volume (lb)",
      last: formatWhole(last.volumeLb),
      now: formatWhole(now.volumeLb),
      delta: pct(now.volumeLb, last.volumeLb),
    },
    {
      label: "Training load",
      last: formatWhole(last.load),
      now: formatWhole(now.load),
      delta: pct(now.load, last.load),
    },
    {
      label: "Active time",
      last: formatHours(last.activeS),
      now: formatHours(now.activeS),
      delta: pct(now.activeS, last.activeS),
    },
  ];
  return (
    <section className={card.card}>
      <div className={card.head}>
        <h2 className={card.title}>This week vs last week</h2>
        <span className={t.small}>last · now</span>
      </div>
      <div className={t.rows}>
        {lines.map((l) => (
          <div key={l.label} className={t.row}>
            <span>{l.label}</span>
            <span className={t.num}>
              <span className={t.small}>{l.last}</span> <b>{l.now}</b>{" "}
              <span className={t.small}>{l.delta}</span>
            </span>
          </div>
        ))}
      </div>
      <p className={card.note}>
        Compared at the same point in the week, not against last week's full
        total.
      </p>
    </section>
  );
}
