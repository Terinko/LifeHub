import type { DayBeforeGroup } from "../lib/insights";
import { REFERENCE_HR } from "../lib/settings";
import { formatPace } from "../lib/units";
import card from "./card.module.css";
import t from "./training.module.css";

type Props = { groups: (DayBeforeGroup & { key: string })[] };

/** Easy-run pace at the same heart rate after rest and after each lift day. */
export function DayBeforeCard({ groups }: Props) {
  const rest = groups.find((g) => g.key === "rest");
  const slowest = [...groups].sort((a, b) => b.pace - a.pace)[0];
  const cost =
    rest && slowest && slowest !== rest ? slowest.pace - rest.pace : 0;
  const fastest = Math.min(...groups.map((g) => g.pace));
  const slow = Math.max(...groups.map((g) => g.pace));
  return (
    <section className={card.card}>
      <h2 className={card.title}>Does lifting slow your next run?</h2>
      <p className={card.note}>
        Easy-run pace at {REFERENCE_HR} bpm, by what you did the day before.
        Last 6 months.
      </p>
      {groups.length < 2 ? (
        <p className={t.empty}>
          This needs at least 3 easy runs after rest and after a lift day.
        </p>
      ) : (
        <>
          <div className={t.rows}>
            {groups.map((g) => (
              <div key={g.key} className={t.row}>
                <div className={t.rowMain}>
                  <span className={t.rowTitle}>{g.label}</span>
                  <span className={t.small}>{g.runs} runs</span>
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 10,
                    borderRadius: 4,
                    background: "var(--log-ground)",
                  }}
                >
                  <div
                    style={{
                      height: 10,
                      borderRadius: 4,
                      width: `${40 + ((g.pace - fastest) / (slow - fastest || 1)) * 60}%`,
                      background:
                        g.key === "rest"
                          ? "var(--log-blue-soft)"
                          : "var(--log-lift)",
                    }}
                  />
                </div>
                <span className={`${t.num} ${t.rowTitle}`}>
                  {formatPace(g.pace)}/mi
                </span>
              </div>
            ))}
          </div>
          {rest && slowest && cost >= 3 && (
            <p className={t.callout}>
              <b>
                {slowest.label} costs you about {Math.round(cost)} s/mi
              </b>{" "}
              on the next day's easy run compared with a rest day.
            </p>
          )}
        </>
      )}
    </section>
  );
}
