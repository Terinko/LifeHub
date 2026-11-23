import { ChevronLeft } from "lucide-react";
import type { RunData } from "@lifehub/shared";
import { fullDate, isoWeek } from "../lib/dates";
import styles from "./RunHeader.module.css";

type Props = {
  today: string;
  data: RunData | undefined;
  refreshing: boolean;
  onBack: () => void;
  onRefresh: () => void;
};

const syncTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

/** Week and date, the title, where the data came from, and Refresh. */
export function RunHeader({
  today,
  data,
  refreshing,
  onBack,
  onRefresh,
}: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.titles}>
        <button className={styles.back} onClick={onBack}>
          <ChevronLeft size={16} aria-hidden />
          Hub
        </button>
        <span className={styles.date}>
          Week {isoWeek(today)} · {fullDate(today)}
        </span>
        <h1 className={styles.title}>Training</h1>
      </div>
      <div className={styles.meta}>
        {data?.source === "example" && (
          <span className={styles.example}>Example data</span>
        )}
        {data?.source === "garmin" && data.syncedAt && (
          <span className={styles.synced}>
            Garmin · synced {syncTime(data.syncedAt)}
          </span>
        )}
        <button
          className={styles.refresh}
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>
    </header>
  );
}
