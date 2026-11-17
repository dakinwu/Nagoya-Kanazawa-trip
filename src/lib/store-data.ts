export type StorePlace = {
  id: string; name: string; googleMapsUrl: string; city: string;
  address: string; notes: string; latitude: number; longitude: number;
};
export function mapCoordinates(value: string) {
  let decoded: string;
  try { decoded = decodeURIComponent(value); } catch { return null; }
  // Place coordinates take precedence; @ only specifies the viewport center.
  const match = decoded.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
    ?? decoded.match(/[?&](?:query|q|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const latitude = Number(match[1]), longitude = Number(match[2]);
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { latitude, longitude } : null;
}
export function isGoogleMapLink(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      ["www.google.com", "google.com", "maps.google.com", "maps.app.goo.gl", "goo.gl", "www.google.co.jp", "maps.google.co.jp"].includes(url.hostname);
  } catch { return false; }
}

export function mapPlaceName(value: string): string | null {
  if (!isGoogleMapLink(value)) return null;
  try {
    const part = new URL(value).pathname.match(/\/maps\/place\/([^/]+)/)?.[1];
    if (!part) return null;
    const name = decodeURIComponent(part.replace(/\+/g, " ")).trim();
    return name && name.length <= 120 && !/^[@!\d.,+\s-]+$/.test(name) ? name : null;
  } catch { return null; }
}
