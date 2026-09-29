import { CalendarDays, ChartPie, List } from "lucide-react";
import styles from "./TabBar.module.css";

export type Tab = "month" | "calendar" | "overview";

const TABS = [
  { id: "month", label: "Bills", Icon: List },
  { id: "calendar", label: "Calendar", Icon: CalendarDays },
  { id: "overview", label: "Overview", Icon: ChartPie },
] as const;

type Props = { tab: Tab; onChange: (tab: Tab) => void };

export function TabBar({ tab, onChange }: Props) {
  return (
    <nav className={styles.bar} aria-label="Bills sections">
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
