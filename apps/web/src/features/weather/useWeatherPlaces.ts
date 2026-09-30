import { useCallback, useEffect, useRef, useState } from "react";
import { locate } from "./api";
import {
  clampSelection,
  findSamePlace,
  upsertCurrentLocation,
} from "./lib/places";
import {
  isAutoLocateOn,
  loadPlaces,
  loadSelected,
  savePlaces,
  saveSelected,
  setAutoLocate,
} from "./storage";
import type { Place } from "./types";

/**
 * The saved places, which one is showing, and the current-location entry
 * that refreshes itself on open. Everything persists in this browser.
 */
export function useWeatherPlaces() {
  const [places, setPlaces] = useState<Place[]>(loadPlaces);
  const [selected, setSelected] = useState<number>(loadSelected);
  const [locating, setLocating] = useState(false);

  const place = places[Math.min(selected, places.length - 1)] || null;

  useEffect(() => savePlaces(places), [places]);
  useEffect(() => saveSelected(selected), [selected]);

  // Latest places for async callbacks (the location fix arrives later).
  const placesRef = useRef(places);
  useEffect(() => {
    placesRef.current = places;
  }, [places]);

  const applyLocation = useCallback((location: Place) => {
    const { places: next, selectIndex } = upsertCurrentLocation(
      placesRef.current,
      location,
    );
    placesRef.current = next;
    setPlaces(next);
    if (selectIndex != null) setSelected(selectIndex);
  }, []);

  // Default to where the user is: refresh the current-location place on
  // every open, no tap needed. Fails quietly (denied, unsupported) and
  // leaves whatever places are already saved.
  const autoLocatedRef = useRef(false);
  useEffect(() => {
    if (autoLocatedRef.current || !isAutoLocateOn()) return;
    autoLocatedRef.current = true;
    setLocating(true);
    locate()
      .then(applyLocation)
      .catch(() => {})
      .finally(() => setLocating(false));
  }, [applyLocation]);

  /** Selects a search result, adding it unless it's already saved. */
  const addPlace = (p: Place) => {
    const idx = findSamePlace(places, p);
    if (idx >= 0) {
      setSelected(idx);
    } else {
      setPlaces([...places, p]);
      setSelected(places.length);
    }
  };

  const removePlace = (id: string) => {
    // Removing the current-location place stops it coming back on open.
    if (places.find((p) => p.id === id)?.isLocation) setAutoLocate(false);
    const next = places.filter((p) => p.id !== id);
    setPlaces(next);
    setSelected((s) => clampSelection(s, next.length));
  };

  /** "Use my location": turns auto-locate back on and selects the fix. */
  const locateMe = (onLocated: () => void) => {
    setAutoLocate(true);
    setLocating(true);
    locate()
      .then((location) => {
        applyLocation(location);
        setSelected(placesRef.current.findIndex((p) => p.isLocation));
        onLocated();
      })
      .catch(() =>
        alert(
          "Location access was blocked. Search for a city or zip code instead.",
        ),
      )
      .finally(() => setLocating(false));
  };

  /** Moves the selection by one (swipes), staying inside the list. */
  const step = (by: number) =>
    setSelected((s) => clampSelection(s + by, places.length));

  return {
    places,
    selected,
    place,
    locating,
    select: setSelected,
    addPlace,
    removePlace,
    locateMe,
    step,
  };
}
