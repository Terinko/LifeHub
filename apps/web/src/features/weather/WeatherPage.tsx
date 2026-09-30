import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "./components/EmptyState";
import { PlaceForecast } from "./components/forecast/PlaceForecast";
import { PlacesSheet } from "./components/places/PlacesSheet";
import { WeatherScene } from "./components/scene/WeatherScene";
import { Sky } from "./components/Sky";
import { WeatherHeader } from "./components/WeatherHeader";
import { sceneFor, sceneKey } from "./lib/codes";
import { usePlaceWeather } from "./queries";
import type { Scene } from "./types";
import { useNow } from "./useNow";
import { useSwipe } from "./useSwipe";
import { useWeatherAccess } from "./useWeatherAccess";
import { useWeatherPlaces } from "./useWeatherPlaces";
import styles from "./WeatherPage.module.css";

/** Shown before the first forecast arrives. */
const DEFAULT_SCENE: Scene = { kind: "partly", isDay: true, intensity: 1 };

export function WeatherPage() {
  const navigate = useNavigate();
  useWeatherAccess();
  const places = useWeatherPlaces();
  const { place } = places;
  const weather = usePlaceWeather(place);
  const now = useNow();
  const [showPlaces, setShowPlaces] = useState(false);
  const swipe = useSwipe(places.places.length >= 2, places.step);

  const current = weather.data?.forecast.current;
  const scene = current ? sceneFor(current.code, current.isDay) : DEFAULT_SCENE;

  const closePlaces = () => setShowPlaces(false);

  return (
    <div className={styles.root}>
      <Sky skyKey={sceneKey(scene)} />
      <WeatherScene scene={scene} />

      <div className={styles.content} {...swipe}>
        <WeatherHeader
          onBack={() => navigate("/")}
          onOpenPlaces={() => setShowPlaces(true)}
        />

        {!place && (
          <EmptyState
            locating={places.locating}
            onLocate={() => places.locateMe(closePlaces)}
            onSearch={() => setShowPlaces(true)}
          />
        )}

        {place && (
          <PlaceForecast
            place={place}
            places={places.places}
            selected={places.selected}
            weather={weather.data}
            failed={weather.isError}
            onRetry={() => void weather.refetch()}
            now={now}
          />
        )}
      </div>

      {showPlaces && (
        <PlacesSheet
          places={places.places}
          selected={places.selected}
          locating={places.locating}
          onSelect={(i) => {
            places.select(i);
            closePlaces();
          }}
          onAdd={(p) => {
            places.addPlace(p);
            closePlaces();
          }}
          onRemove={places.removePlace}
          onUseLocation={() => places.locateMe(closePlaces)}
          onClose={closePlaces}
        />
      )}
    </div>
  );
}
