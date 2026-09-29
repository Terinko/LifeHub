import { ChartColumn, CircleDot, History, Users } from "lucide-react";
import styles from "./TabBar.module.css";

export type Tab = "game" | "roster" | "history" | "stats";

const TABS = [
  { id: "game", label: "Game", Icon: CircleDot },
  { id: "roster", label: "Roster", Icon: Users },
  { id: "history", label: "History", Icon: History },
  { id: "stats", label: "Stats", Icon: ChartColumn },
] as const;

type Props = { tab: Tab; onChange: (tab: Tab) => void };

/** The floating glass tab bar; the selected tab is a brighter lens. */
export function TabBar({ tab, onChange }: Props) {
  return (
    <nav className={styles.bar} aria-label="Poker sections">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={styles.tab}
          aria-current={tab === id ? "page" : undefined}
          onClick={() => onChange(id)}
        >
          <Icon size={20} strokeWidth={2} aria-hidden />
          {label}
        </button>
      ))}
    </nav>
  );
}
