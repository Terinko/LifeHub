import { CircleAlert } from "lucide-react";
import styles from "./Notice.module.css";

type Props = {
  tone?: "info" | "warning" | "error";
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void };
};

/** Empty, warning and error states: what happened and what to do next. */
export function Notice({ tone = "info", title, body, action }: Props) {
  return (
    <div
      className={`${styles.notice} ${styles[tone]}`}
      role={tone === "error" ? "alert" : undefined}
    >
      {tone !== "info" && (
        <CircleAlert
          className={styles.icon}
          size={18}
          strokeWidth={2.2}
          aria-hidden
        />
      )}
      <div className={styles.text}>
        <strong className={styles.title}>{title}</strong>
        {body && <span className={styles.body}>{body}</span>}
      </div>
      {action && (
        <button
          type="button"
          className={styles.action}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
