import { Clock, TrendingDown, TrendingUp, Equal } from "lucide-react";
import type { Tone } from "../../lib/status";
import styles from "./StatusLine.module.css";

const ICONS = {
  ahead: TrendingUp,
  behind: TrendingDown,
  even: Equal,
  neutral: Clock,
};

export function StatusLine({ tone, text }: { tone: Tone; text: string }) {
  const Icon = ICONS[tone];
  return (
    <div className={styles.line} data-tone={tone}>
      <Icon size={18} strokeWidth={2.2} aria-hidden className={styles.icon} />
      <span>{text}</span>
    </div>
  );
}
