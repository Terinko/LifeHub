import { codeLabel } from "../../lib/codes";
import { round } from "../../lib/format";
import type { Forecast, Place } from "../../types";
import { useCountUp } from "../../useCountUp";
import { WeatherIcon } from "../WeatherIcon";
import styles from "./Hero.module.css";

type Props = {
  place: Place;
  places: Place[];
  selected: number;
  forecast: Forecast | undefined;
  failed: boolean;
};

/** Place name, page dots, and the big current temperature. */
export function Hero({ place, places, selected, forecast, failed }: Props) {
  const heroTemp = useCountUp(forecast?.current.temp ?? null);
  const today = forecast?.daily[0];

  return (
    <section className={styles.hero}>
      <div className={styles.place}>{place.name}</div>
      {places.length > 1 && (
        <div className={styles.dots} aria-hidden="true">
          {places.map((p, i) => (
            <span key={p.id} className={i === selected ? styles.on : ""} />
          ))}
        </div>
      )}
      {forecast ? (
        <>
          <WeatherIcon
            code={forecast.current.code}
            isDay={forecast.current.isDay}
            size={52}
            className={styles.icon}
          />
          <div className={styles.temp}>{round(heroTemp)}°</div>
          <div className={styles.label}>
            {codeLabel(forecast.current.code, forecast.current.isDay)}
          </div>
          <div className={styles.sub}>
            H {round(today?.hi)}° L {round(today?.lo)}
            {"° · Feels like "}
            {round(forecast.current.feels)}°
          </div>
        </>
      ) : failed ? null : (
        <div className={`${styles.sub} ${styles.loading}`}>
          Loading forecast…
        </div>
      )}
    </section>
  );
}
