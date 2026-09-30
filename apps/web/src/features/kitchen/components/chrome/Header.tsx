import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import styles from "./Header.module.css";

type Props = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  /** A 44px control on the right, like Add. */
  action?: ReactNode;
};

export function Header({ title, subtitle, onBack, action }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.top}>
        <button type="button" className={styles.back} onClick={onBack}>
          <ChevronLeft size={20} strokeWidth={2.2} aria-hidden />
          Hub
        </button>
        {action}
      </div>
      <div className={styles.titles}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </div>
    </header>
  );
}
