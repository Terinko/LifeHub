import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchPlacePreviews, fetchPlaceWeather, searchPlaces } from "./api";
import type { Place } from "./types";

/** Forecasts older than this refetch when the app comes back to the front. */
const STALE_MS = 10 * 60 * 1000;

export const weatherKeys = {
  place: (id: string) => ["weather", "place", id] as const,
  previews: (places: Place[]) =>
    ["weather", "previews", places.map((p) => [p.id, p.lat, p.lon])] as const,
  search: (query: string) => ["weather", "search", query] as const,
};

/**
 * Forecast + alerts for the selected place. Stays fresh for 10 minutes, and
 * refetches when the tab becomes visible again after that.
 */
export function usePlaceWeather(place: Place | null) {
  return useQuery({
    queryKey: weatherKeys.place(place?.id ?? ""),
    queryFn: () =>
      fetchPlaceWeather(place as Place).catch((e: unknown) => {
        console.error(e);
        throw e;
      }),
    enabled: place != null,
    staleTime: STALE_MS,
    refetchOnWindowFocus: true,
    retry: false,
  });
}

/** Current temperature and conditions for every row in the places list. */
export function usePlacePreviews(places: Place[]) {
  return useQuery({
    queryKey: weatherKeys.previews(places),
    queryFn: () => fetchPlacePreviews(places),
    retry: false,
  });
}

/** US places matching a (debounced) search of two or more characters. */
export function usePlaceSearch(query: string) {
  return useQuery({
    queryKey: weatherKeys.search(query),
    queryFn: () => searchPlaces(query).catch(() => []),
    enabled: query.length >= 2,
    placeholderData: keepPreviousData,
    retry: false,
  });
}
