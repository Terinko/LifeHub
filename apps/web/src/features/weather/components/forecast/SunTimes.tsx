import { Sunrise, Sunset } from "lucide-react";
import { clockLabel } from "../../lib/format";
import type { DayForecast } from "../../types";
import glass from "../glass.module.css";
import styles from "./SunTimes.module.css";

/** Today's sunrise and sunset. */
export function SunTimes({ today }: { today: DayForecast | undefined }) {
  return (
    <div className={`${glass.glass} ${styles.sun}`}>
      <span>
        <Sunrise size={18} aria-hidden="true" /> {clockLabel(today?.sunrise)}
      </span>
      <span>
        <Sunset size={18} aria-hidden="true" /> {clockLabel(today?.sunset)}
      </span>
    </div>
  );
}
