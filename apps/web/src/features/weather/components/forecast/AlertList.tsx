import { useState } from "react";
import { ChevronDown, TriangleAlert } from "lucide-react";
import { alertUntil, isSevere } from "../../lib/alerts";
import type { WeatherAlert } from "../../types";
import glass from "../glass.module.css";
import text from "../text.module.css";
import styles from "./AlertList.module.css";

/** NWS alerts as tappable cards; one at a time expands to the full text. */
export function AlertList({ alerts }: { alerts: WeatherAlert[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <>
      {alerts.map((a) => {
        const open = expanded === a.id;
        const severe = isSevere(a) ? ` ${styles.severe}` : "";
        return (
          <button
            key={a.id}
            className={`${glass.glass} ${styles.alert}${severe}`}
            onClick={() => setExpanded(open ? null : a.id)}
          >
            <div className={styles.top}>
              <TriangleAlert
                size={20}
                className={styles.pulse}
                aria-hidden="true"
              />
              <div className={styles.text}>
                <div className={styles.title}>{a.event}</div>
                <div className={text.small}>
                  {alertUntil(a)}National Weather Service
                </div>
              </div>
              <ChevronDown
                size={18}
                className={`${styles.chevron}${open ? ` ${styles.open}` : ""}`}
                aria-hidden="true"
              />
            </div>
            {open && (
              <div className={styles.body}>
                {a.description}
                {a.instruction ? `\n\n${a.instruction}` : ""}
              </div>
            )}
          </button>
        );
      })}
    </>
  );
}
