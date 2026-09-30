import type { ChangelogEntry } from "@lifehub/shared";
import { changelogTag } from "../lib/changelog";
import styles from "./WhatsNewDialog.module.css";

type Props = {
  entries: ChangelogEntry[];
  onDone: () => void;
};

/** The "What's New" popup: changelog entries this user hasn't seen yet. */
export function WhatsNewDialog({ entries, onDone }: Props) {
  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.header}>What's New</div>
        <div className={styles.body}>
          {entries.map((entry) => (
            <div key={entry.id} className={styles.entry}>
              <div className={styles.tag}>{changelogTag(entry)}</div>
              <ul>
                {entry.bullets.map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className={styles.footer}>
          <button onClick={onDone} className={styles.done}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
