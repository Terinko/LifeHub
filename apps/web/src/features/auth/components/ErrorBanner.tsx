import type { ReactNode } from "react";
import styles from "./form.module.css";

export function ErrorBanner({ children }: { children: ReactNode }) {
  return <div className={styles.error}>{children}</div>;
}
