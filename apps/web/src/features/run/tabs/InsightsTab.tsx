import { AdherenceCard } from "../components/AdherenceCard";
import { DayBeforeCard } from "../components/DayBeforeCard";
import { HrvCard } from "../components/HrvCard";
import { TimeSplitCard } from "../components/TimeSplitCard";
import { WeekdayCard } from "../components/WeekdayCard";
import type { Dashboard } from "../lib/dashboard";
import styles from "./tabs.module.css";

/** Insights: how runs and lifts affect each other, and patterns over time. */
export function InsightsTab({ dash }: { dash: Dashboard }) {
  const i = dash.insights;
  return (
    <div className={styles.columns}>
      <div className={styles.column}>
        <DayBeforeCard groups={i.dayBefore} />
        <TimeSplitCard weeks={i.time} />
        <WeekdayCard paces={i.weekdays} />
      </div>
      <div className={styles.column}>
        <AdherenceCard weeks={i.adherence} />
        <HrvCard hrv={i.hrv} />
      </div>
    </div>
  );
}
