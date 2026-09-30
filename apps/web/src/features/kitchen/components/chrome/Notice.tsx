import styles from "./Notice.module.css";

type Props = {
  tone?: "info" | "error";
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void };
};

/** Empty and error states: what happened and what to do next. */
export function Notice({ tone = "info", title, body, action }: Props) {
  return (
    <div
      className={`${styles.notice} ${tone === "error" ? styles.error : ""}`}
      role={tone === "error" ? "alert" : undefined}
    >
      <strong className={styles.title}>{title}</strong>
      {body && <span className={styles.body}>{body}</span>}
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
