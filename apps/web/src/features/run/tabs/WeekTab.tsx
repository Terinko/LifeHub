import type { Dashboard } from "../lib/dashboard";
import { DaysStrip } from "../components/DaysStrip";
import { LoadCard } from "../components/LoadCard";
import { ProgressionCard } from "../components/ProgressionCard";
import { RecoveryCard } from "../components/RecoveryCard";
import { RotationCard } from "../components/RotationCard";
import { WeekCompare } from "../components/WeekCompare";
import styles from "./tabs.module.css";

/** Home: where the rotation stands, progress, and this week at a glance. */
export function WeekTab({ dash, today }: { dash: Dashboard; today: string }) {
  const { week } = dash;
  return (
    <div className={styles.columns}>
      <div className={styles.column}>
        <RotationCard
          entries={week.rotation.entries}
          next={week.rotation.next}
          today={today}
        />
        <ProgressionCard progression={dash.progression} />
        <DaysStrip days={week.strip} />
      </div>
      <div className={styles.column}>
        <LoadCard points={week.ratio} />
        <WeekCompare now={week.compare.now} last={week.compare.last} />
        <RecoveryCard hrv={week.hrv} />
      </div>
    </div>
  );
}
