import type { ReactNode } from "react";
import card from "../chrome/card.module.css";
import styles from "./ChartCard.module.css";

type Props = { title: string; children: ReactNode };

export function ChartCard({ title, children }: Props) {
  return (
    <section className={`${card.card} ${styles.card}`} aria-label={title}>
      <h2 className={card.eyebrow}>{title}</h2>
      {children}
    </section>
  );
}
