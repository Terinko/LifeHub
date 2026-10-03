import type { ReactNode } from "react";
import styles from "./Notice.module.css";

type Props = { children: ReactNode; tone?: "note" | "error" };

/** A soft callout: an explainer, an empty day, or a load error. */
export function Notice({ children, tone = "note" }: Props) {
  return (
    <p
      className={styles.notice}
      data-tone={tone}
      role={tone === "error" ? "alert" : undefined}
    >
      {children}
    </p>
  );
}
