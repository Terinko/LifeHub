import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import styles from "./GlassHeader.module.css";

type Props = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  /** A 44px control on the right, e.g. refresh. */
  action?: ReactNode;
};

export function GlassHeader({ title, subtitle, onBack, action }: Props) {
  return (
    <header className={styles.bar}>
      <button
        type="button"
        className={styles.round}
        onClick={onBack}
        aria-label="Back to hub"
      >
        <ChevronLeft size={22} strokeWidth={2.2} aria-hidden />
      </button>
      <div className={styles.titles}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </div>
      <div className={styles.slot}>{action}</div>
    </header>
  );
}
