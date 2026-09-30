import { CalendarDays } from "lucide-react";
import { dayLabel, round } from "../../lib/format";
import { nowMarker, rangeBar, weekScale } from "../../lib/tempScale";
import type { DayForecast } from "../../types";
import { WeatherIcon } from "../WeatherIcon";
import glass from "../glass.module.css";
import text from "../text.module.css";
import styles from "./TenDayCard.module.css";

type Props = { daily: DayForecast[]; currentTemp: number | null };

type Day = DayForecast & { hi: number; lo: number };
const hasRange = (d: DayForecast): d is Day => d.hi != null && d.lo != null;

/** Ten days of lows and highs on one shared scale, with today's "now" dot. */
export function TenDayCard({ daily, currentTemp }: Props) {
  const days = daily.filter(hasRange);
  if (!days.length) return null;
  const pct = weekScale(days);

  return (
    <div className={glass.glass}>
      <div className={text.label}>
        <CalendarDays size={13} aria-hidden="true" /> 10-DAY FORECAST
      </div>
      {days.map((d, i) => (
        <div key={d.date} className={styles.day}>
          <span className={styles.name}>{dayLabel(d.date, i)}</span>
          <span className={styles.icon}>
            <WeatherIcon code={d.code} size={20} />
            {(d.pop ?? 0) >= 30 && <span className={text.pop}>{d.pop}%</span>}
          </span>
          <span className={styles.lo}>{round(d.lo)}°</span>
          <span className={styles.range}>
            <i style={rangeBar(d, pct)} />
            {i === 0 && currentTemp != null && (
              <b style={{ left: nowMarker(currentTemp, pct) }} />
            )}
          </span>
          <span className={styles.hi}>{round(d.hi)}°</span>
        </div>
      ))}
    </div>
  );
}
