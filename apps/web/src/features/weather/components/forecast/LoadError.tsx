import buttons from "../buttons.module.css";
import glass from "../glass.module.css";
import styles from "./LoadError.module.css";

/** Shown in place of the forecast when the first load failed. */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={`${glass.glass} ${styles.error}`}>
      Couldn't load the forecast.
      <button className={buttons.pill} onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
