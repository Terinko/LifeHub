import { ApiError } from "../../../shared/api/client";
import { ebaySoldUrl, terapeakUrl } from "../lib/links";
import styles from "../thrift.module.css";

/** The two-step progress shown while the tag is read or eBay is searched. */
export function Checking({
  photoUrl,
  steps,
}: {
  photoUrl: string | undefined;
  steps: [string, string];
}) {
  return (
    <div className={styles.checking} role="status">
      {photoUrl && (
        <img
          className={styles.photo}
          style={{ width: 96, height: 96 }}
          src={photoUrl}
          alt=""
        />
      )}
      <ul className={styles.steps}>
        <li className={styles.done}>
          <span className={styles.dot} />
          {steps[0]}
        </li>
        <li className={styles.now}>
          <span className={styles.dot} />
          {steps[1]}
        </li>
      </ul>
    </div>
  );
}

export function LookupError({
  error,
  query,
  onRetry,
  onEdit,
}: {
  error: Error;
  query: string;
  onRetry: () => void;
  onEdit: () => void;
}) {
  const status = error instanceof ApiError ? error.status : 0;
  const body =
    status === 0
      ? "Check your signal and try again. Your answers are kept."
      : error.message;

  return (
    <>
      <div className={`${styles.verdict} ${styles.unsure}`}>
        <div className={styles.word}>Couldn't reach eBay</div>
        <div>{body}</div>
      </div>
      <button type="button" className={styles.main} onClick={onRetry}>
        Try again
      </button>
      <a
        className={styles.quiet}
        href={terapeakUrl(query)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Check real sales in Terapeak ↗
      </a>
      <a
        className={styles.textBtn}
        style={{ textAlign: "center" }}
        href={ebaySoldUrl(query)}
        target="_blank"
        rel="noopener noreferrer"
      >
        No seller account? eBay's Sold filter ↗
      </a>
      <button type="button" className={styles.textBtn} onClick={onEdit}>
        Edit the search
      </button>
    </>
  );
}
