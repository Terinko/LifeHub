import { EasyPaceCard } from "../components/EasyPaceCard";
import { IntensityCard } from "../components/IntensityCard";
import { RaceCard } from "../components/RaceCard";
import { RecentRuns } from "../components/RecentRuns";
import { RecordsCard } from "../components/RecordsCard";
import { StatTile } from "../components/StatTile";
import { WeeklyMileage } from "../components/WeeklyMileage";
import type { Dashboard } from "../lib/dashboard";
import { trendStart } from "../lib/dashboard";
import { shortDate } from "../lib/dates";
import { EASY_HR, TREND_WEEKS } from "../lib/settings";
import { formatMiles } from "../lib/units";
import t from "../components/training.module.css";
import styles from "./tabs.module.css";

/** Running: volume, aerobic fitness, intensity, predictions and records. */
export function RunningTab({
  dash,
  today,
}: {
  dash: Dashboard;
  today: string;
}) {
  const r = dash.running;
  const since = trendStart(today);
  const latest = r.vo2.at(-1);
  const before = [...r.vo2].reverse().find((v) => v.date <= since) ?? r.vo2[0];
  const vo2Change = latest && before ? latest.value - before.value : 0;
  return (
    <>
      <section aria-label="Summary" className={t.tiles}>
        <StatTile
          label="Year to date"
          value={formatMiles(r.yearMiles)}
          unit="mi"
        />
        <StatTile
          label="VO₂ max"
          value={latest ? String(latest.value) : "—"}
          unit="ml/kg/min"
          note={
            latest && before
              ? `${vo2Change > 0 ? "+" : vo2Change < 0 ? "−" : "±"}${Math.abs(vo2Change)} since ${shortDate(before.date)}`
              : undefined
          }
          tone={vo2Change > 0 ? "good" : undefined}
        />
        <StatTile
          label="Weekly average"
          value={formatMiles(r.averageWeek)}
          unit="mi"
          note="Last 4 finished weeks"
        />
        <StatTile
          label="Longest run"
          value={formatMiles(r.longestRun)}
          unit="mi"
          note="Last 4 weeks"
        />
      </section>
      <WeeklyMileage days={r.days} today={today} average={r.averageWeek} />
      <div className={styles.columns}>
        <div className={styles.column}>
          <EasyPaceCard
            points={r.easyPace}
            band={EASY_HR}
            first={since}
            weeks={TREND_WEEKS}
          />
          <IntensityCard weeks={r.mix} />
        </div>
        <div className={styles.column}>
          <RaceCard races={r.races} vo2={latest?.value} />
          <RecordsCard records={r.records} />
        </div>
      </div>
      <RecentRuns runs={r.recent} />
    </>
  );
}
