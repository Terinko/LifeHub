import { minutesAgo } from "../../lib/format";
import styles from "./UpdatedFooter.module.css";

type Props = { now: number; updatedAt: number };

/** How fresh the data is, plus the attribution Open-Meteo's license asks for. */
export function UpdatedFooter({ now, updatedAt }: Props) {
  // The odd-looking {"Updated"} keeps the text nodes (and so the glyph
  // positions) exactly as they were before the TypeScript move.
  return (
    <footer className={styles.footer}>
      {"Updated"} {minutesAgo(now, updatedAt)} min ago ·{" "}
      <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
        Weather data by Open-Meteo.com
      </a>{" "}
      (CC BY 4.0) · Alerts from the National Weather Service
    </footer>
  );
}
