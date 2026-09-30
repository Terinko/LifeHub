import { CookingPot, List, Package } from "lucide-react";
import styles from "./TabBar.module.css";

export type Tab = "list" | "pantry" | "meals";

const TABS = [
  { id: "list", label: "List", Icon: List },
  { id: "pantry", label: "Pantry", Icon: Package },
  { id: "meals", label: "Meals", Icon: CookingPot },
] as const;

type Props = { tab: Tab; onChange: (tab: Tab) => void };

export function TabBar({ tab, onChange }: Props) {
  return (
    <nav className={styles.bar} aria-label="Kitchen sections">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={styles.tab}
          aria-current={tab === id ? "page" : undefined}
          onClick={() => onChange(id)}
        >
          <Icon size={18} strokeWidth={2} aria-hidden />
          {label}
        </button>
      ))}
    </nav>
  );
}
