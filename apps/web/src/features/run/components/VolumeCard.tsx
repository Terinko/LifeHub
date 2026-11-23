import { useState } from "react";
import { shortDate } from "../lib/dates";
import type { VolumePoint } from "../lib/lifting";
import card from "./card.module.css";
import styles from "./VolumeCard.module.css";
import t from "./training.module.css";

type Split = "back" | "chest";
type Props = { volume: Record<Split, VolumePoint[]> };

const LABEL: Record<Split, string> = {
  back: "Back + Bi",
  chest: "Chest + Tri",
};

/** Pounds moved per session of one lift day; rising bars are progressive overload. */
export function VolumeCard({ volume }: Props) {
  const [split, setSplit] = useState<Split>("back");
  const points = volume[split];
  const max = Math.max(1, ...points.map((p) => p.lb));
  const min = Math.min(...points.map((p) => p.lb), max) * 0.8;
  const first = points[0];
  return (
    <section className={card.card}>
      <div className={card.head}>
        <h2 className={card.title}>Session volume</h2>
        <div role="group" aria-label="Lift day" className={t.toggle}>
          {(["back", "chest"] as const).map((s) => (
            <button
              key={s}
              aria-pressed={split === s}
              onClick={() => setSplit(s)}
            >
              {LABEL[s]}
            </button>
          ))}
        </div>
      </div>
      <p className={card.note}>
        Total pounds moved each {LABEL[split]} session (weight × reps).
      </p>
      {points.length === 0 ? (
        <p className={t.empty}>No {LABEL[split]} sessions with sets yet.</p>
      ) : (
        <>
          <div className={styles.bars}>
            {points.map((p, i) => (
              <div key={`${p.date}-${i}`} className={styles.col}>
                {i === points.length - 1 && (
                  <span className={`${t.num} ${styles.value}`}>
                    {(p.lb / 1000).toFixed(1)}k
                  </span>
                )}
                <div
                  className={styles.bar}
                  data-last={i === points.length - 1 || undefined}
                  style={{
                    height: `${((p.lb - min) / (max - min || 1)) * 85 + 15}%`,
                  }}
                  title={`${shortDate(p.date)}: ${Math.round(p.lb).toLocaleString("en-US")} lb`}
                />
              </div>
            ))}
          </div>
          <div className={`${t.legend} ${t.num}`}>
            <span>{first ? shortDate(first.date) : ""}</span>
            <span style={{ marginLeft: "auto" }}>Latest</span>
          </div>
        </>
      )}
    </section>
  );
}
