import {
  APPLICATION_STATUSES,
  type Application,
  type ApplicationStatus,
} from "@lifehub/shared";
import { groupByStatus } from "../lib/board";
import { ApplicationCard } from "./ApplicationCard";
import styles from "./ApplicationBoard.module.css";

type Props = {
  applications: Application[];
  onEdit: (app: Application) => void;
  onDelete: (app: Application) => void;
  onMove: (app: Application, status: ApplicationStatus) => void;
};

export function ApplicationBoard({ applications, ...cardActions }: Props) {
  const columns = groupByStatus(applications);

  return (
    <div className={styles.board}>
      {APPLICATION_STATUSES.map((status) => (
        <section className={styles.column} key={status} aria-label={status}>
          <div className={styles.columnHeader}>
            <span>{status}</span>
            <span className={styles.count}>{columns[status].length}</span>
          </div>

          {columns[status].length === 0 ? (
            <div className={styles.empty}>No applications</div>
          ) : (
            columns[status].map((app) => (
              <ApplicationCard
                key={app.sk}
                application={app}
                {...cardActions}
              />
            ))
          )}
        </section>
      ))}
    </div>
  );
}
