import { ApiError } from "../../../shared/api/client";
import { ebaySoldUrl, poshmarkSoldUrl } from "../lib/links";
import styles from "../thrift.module.css";

/** The two-step progress shown while the tag is read or sales are found. */
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
        <div className={styles.word}>Couldn't get sales</div>
        <div>{body}</div>
      </div>
      <button type="button" className={styles.main} onClick={onRetry}>
        Try again
      </button>
      <a
        className={styles.quiet}
        href={poshmarkSoldUrl(query)}
        target="_blank"
        rel="noopener noreferrer"
      >
        See sold listings on Poshmark ↗
      </a>
      <a
        className={styles.textBtn}
        style={{ textAlign: "center" }}
        href={ebaySoldUrl(query)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Or eBay's sold listings ↗
      </a>
      <button type="button" className={styles.textBtn} onClick={onEdit}>
        Edit the search
      </button>
    </>
  );
}
