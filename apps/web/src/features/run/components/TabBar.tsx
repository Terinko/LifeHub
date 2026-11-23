import { TABS, type Tab } from "../lib/tabs";
import styles from "./TabBar.module.css";

type Props = { tab: Tab; onChange: (tab: Tab) => void };

/** The four views of the Training page. */
export function TabBar({ tab, onChange }: Props) {
  return (
    <nav aria-label="Training views" className={styles.tabs}>
      {TABS.map((t) => (
        <button
          key={t.key}
          className={styles.tab}
          aria-current={tab === t.key ? "page" : undefined}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
