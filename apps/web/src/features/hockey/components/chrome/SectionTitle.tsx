import styles from "./SectionTitle.module.css";

type Props = { children: string; tone?: "red" | "blue" | "muted" };

/** "LIVE ——" : a condensed label with a rink line running off to the right. */
export function SectionTitle({ children, tone = "blue" }: Props) {
  return (
    <h2 className={styles.title} data-tone={tone}>
      <span>{children}</span>
      <span className={styles.line} aria-hidden />
    </h2>
  );
}
