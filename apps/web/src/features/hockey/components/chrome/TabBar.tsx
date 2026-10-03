import { BarChart3, CircleDot, ListOrdered, Shield } from "lucide-react";
import styles from "./TabBar.module.css";

export type Tab = "scores" | "poll" | "npi" | "team";

type Props = { tab: Tab; teamLabel: string; onChange: (tab: Tab) => void };

/** The floating glass tab bar; the selected tab sits in a bright lens. */
export function TabBar({ tab, teamLabel, onChange }: Props) {
  const tabs = [
    { id: "scores", label: "Scores", Icon: CircleDot },
    { id: "poll", label: "Poll", Icon: ListOrdered },
    { id: "npi", label: "NPI", Icon: BarChart3 },
    { id: "team", label: teamLabel, Icon: Shield },
  ] as const;
  return (
    <nav className={styles.bar} aria-label="Hockey sections">
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={styles.tab}
          aria-current={tab === id ? "page" : undefined}
          onClick={() => onChange(id)}
        >
          <Icon size={20} strokeWidth={2.2} aria-hidden />
          <span className={styles.label}>{label}</span>
        </button>
      ))}
    </nav>
  );
}
