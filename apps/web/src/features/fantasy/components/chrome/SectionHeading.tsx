import styles from "./SectionHeading.module.css";

export function SectionHeading({
  title,
  aside,
}: {
  title: string;
  aside?: string;
}) {
  return (
    <div className={styles.row}>
      <h2 className={styles.title}>{title}</h2>
      {aside && <span className={styles.aside}>{aside}</span>}
    </div>
  );
}
