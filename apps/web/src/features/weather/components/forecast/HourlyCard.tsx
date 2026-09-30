import { Clock } from "lucide-react";
import { hourLabel, round } from "../../lib/format";
import type { HourForecast } from "../../types";
import { WeatherIcon } from "../WeatherIcon";
import glass from "../glass.module.css";
import text from "../text.module.css";
import styles from "./HourlyCard.module.css";

/** The next 24 hours, scrolling sideways. */
export function HourlyCard({ hours }: { hours: HourForecast[] }) {
  return (
    <div className={glass.glass}>
      <div className={text.label}>
        <Clock size={13} aria-hidden="true" /> HOURLY
      </div>
      <div className={styles.hourly}>
        {hours.map((h, i) => (
          <div key={h.time} className={styles.hour}>
            <span className={text.small}>
              {i === 0 ? "Now" : hourLabel(h.time)}
            </span>
            <WeatherIcon code={h.code} isDay={h.isDay} size={22} />
            <span className={text.pop}>
              {(h.pop ?? 0) >= 20 ? `${h.pop}%` : " "}
            </span>
            <b>{round(h.temp)}°</b>
          </div>
        ))}
      </div>
    </div>
  );
}
