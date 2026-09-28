import { CalendarDays, Trophy } from "lucide-react";
import styles from "./TabBar.module.css";

export type Tab = "week" | "leagues";

const TABS = [
  { id: "week", label: "This Week", Icon: CalendarDays },
  { id: "leagues", label: "My Leagues", Icon: Trophy },
] as const;

type Props = { tab: Tab; onChange: (tab: Tab) => void };

/** The floating glass tab bar; the selected tab is a brighter lens. */
export function TabBar({ tab, onChange }: Props) {
  return (
    <nav className={styles.bar} aria-label="Fantasy sections">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={styles.tab}
          aria-current={tab === id ? "page" : undefined}
          onClick={() => onChange(id)}
        >
          <Icon size={18} strokeWidth={2.2} aria-hidden />
          {label}
        </button>
      ))}
    </nav>
  );
}
