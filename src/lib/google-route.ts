import type { Place } from "./trip-data";

// Leave mode selection to Google Maps; do not force walking or start turn-by-turn navigation.
export function googleRouteUrl(from: Place, to: Place): string {
  const query = new URLSearchParams({ api: "1", origin: `${from.latitude},${from.longitude}`, destination: `${to.latitude},${to.longitude}` });
  return `https://www.google.com/maps/dir/?${query.toString()}`;
}

