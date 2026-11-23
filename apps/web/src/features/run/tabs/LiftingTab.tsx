import { LastSessionCard } from "../components/LastSessionCard";
import { LiftRecordsCard } from "../components/LiftRecordsCard";
import { MaxCard } from "../components/MaxCard";
import { SetsCard } from "../components/SetsCard";
import { VolumeCard } from "../components/VolumeCard";
import card from "../components/card.module.css";
import type { Dashboard } from "../lib/dashboard";
import styles from "./tabs.module.css";

type Props = { dash: Dashboard; pending: number };

/** Lifting: sets per muscle, strength trends, volume and the last session. */
export function LiftingTab({ dash, pending }: Props) {
  const l = dash.lifting;
  const noSets = l.lifts.length > 0 && l.withoutSets === l.lifts.length;
  return (
    <>
      {(noSets || pending > 0) && (
        <p className={`${card.card} ${styles.notice}`}>
          {pending > 0
            ? `Still reading sets from ${pending} older ${pending === 1 ? "activity" : "activities"}. Each visit reads a few more.`
            : "Garmin hasn't sent sets for your strength sessions. Use Check what Garmin sends at the bottom of the page to see why."}
        </p>
      )}
      <div className={styles.columns}>
        <div className={styles.column}>
          <SetsCard sets={l.sets} />
          <MaxCard maxes={l.maxes} />
          <VolumeCard volume={l.volume} />
        </div>
        <div className={styles.column}>
          <LastSessionCard last={l.last} />
          <LiftRecordsCard records={l.records} />
        </div>
      </div>
    </>
  );
}
