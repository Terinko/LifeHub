import type { Outcome } from "../../lib/profile";
import styles from "./FormGuide.module.css";

const WORDS: Record<Outcome, string> = { W: "won", L: "lost", E: "even" };

/** The last few results as dots, oldest on the left. */
export function FormGuide({ results }: { results: Outcome[] }) {
  return (
    <span
      className={styles.form}
      aria-label={`Last ${results.length}: ${results.map((r) => WORDS[r]).join(", ")}`}
    >
      {results.map((r, i) => (
        <span key={i} className={`${styles.dot} ${styles[r]}`} aria-hidden>
          {r}
        </span>
      ))}
    </span>
  );
}
