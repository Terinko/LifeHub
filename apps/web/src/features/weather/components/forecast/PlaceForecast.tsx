import type { Place, PlaceWeather } from "../../types";
import { AlertList } from "./AlertList";
import { DetailTiles } from "./DetailTiles";
import { Hero } from "./Hero";
import { HourlyCard } from "./HourlyCard";
import { LoadError } from "./LoadError";
import { NowcastCard } from "./NowcastCard";
import { SunTimes } from "./SunTimes";
import { TenDayCard } from "./TenDayCard";
import { UpdatedFooter } from "./UpdatedFooter";

type Props = {
  place: Place;
  places: Place[];
  selected: number;
  weather: PlaceWeather | undefined;
  failed: boolean;
  onRetry: () => void;
  now: number;
};

/**
 * Everything under the header for the selected place. Renders its cards as
 * siblings (no wrapper) so the glass sweep's nth-child stagger still works.
 */
export function PlaceForecast({
  place,
  places,
  selected,
  weather,
  failed,
  onRetry,
  now,
}: Props) {
  const forecast = weather?.forecast;
  return (
    <>
      <Hero
        place={place}
        places={places}
        selected={selected}
        forecast={forecast}
        failed={failed}
      />
      {failed && !forecast && <LoadError onRetry={onRetry} />}
      {weather && forecast && (
        <>
          <AlertList alerts={weather.alerts} />
          {forecast.nowcast.text && <NowcastCard nowcast={forecast.nowcast} />}
          <HourlyCard hours={forecast.hourly} />
          <TenDayCard
            daily={forecast.daily}
            currentTemp={forecast.current.temp}
          />
          <DetailTiles current={forecast.current} today={forecast.daily[0]} />
          <SunTimes today={forecast.daily[0]} />
          <UpdatedFooter now={now} updatedAt={forecast.updatedAt} />
        </>
      )}
    </>
  );
}
