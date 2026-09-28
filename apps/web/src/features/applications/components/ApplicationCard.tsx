import {
  APPLICATION_STATUSES,
  type Application,
  type ApplicationStatus,
} from "@lifehub/shared";
import { formatAge, isStale } from "../lib/age";
import { lastActivity } from "../lib/board";
import styles from "./ApplicationCard.module.css";

type Props = {
  application: Application;
  onEdit: (app: Application) => void;
  onDelete: (app: Application) => void;
  onMove: (app: Application, status: ApplicationStatus) => void;
};

export function ApplicationCard({
  application: app,
  onEdit,
  onDelete,
  onMove,
}: Props) {
  const lastChange = lastActivity(app);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.company}>{app.company}</div>
          <div className={styles.position}>{app.position}</div>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.iconButton}
            onClick={() => onEdit(app)}
            aria-label={`Edit ${app.company}`}
          >
            ✎
          </button>
          <button
            className={`${styles.iconButton} ${styles.deleteButton}`}
            onClick={() => onDelete(app)}
            aria-label={`Delete ${app.company}`}
          >
            ✕
          </button>
        </div>
      </div>

      {app.location && <div className={styles.meta}>{app.location}</div>}
      <div className={styles.meta}>Applied {app.dateApplied}</div>

      {isStale(lastChange) && (
        <div className={styles.stale}>
          ⏱ No update in {formatAge(lastChange)}
        </div>
      )}

      <select
        className={styles.statusSelect}
        value={app.status}
        onChange={(e) => onMove(app, e.target.value as ApplicationStatus)}
        aria-label={`Status of ${app.company}`}
      >
        {APPLICATION_STATUSES.map((s) => (
          <option key={s} value={s}>
            Move to {s}
          </option>
        ))}
      </select>
    </div>
  );
}
