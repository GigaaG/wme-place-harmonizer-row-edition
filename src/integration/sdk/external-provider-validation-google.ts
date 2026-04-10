import type { SearchOrigin } from "./external-provider-validation-types.ts";

let placesServiceContainer: HTMLDivElement | null = null;

function getGoogleHostWindow(): Window & { google?: any } {
  try {
    if (typeof unsafeWindow !== "undefined") {
      return unsafeWindow as Window & { google?: any };
    }
  } catch {
    // ignore
  }

  return window as Window & { google?: any };
}

export function getGoogleMapsApi(): any | null {
  const googleMaps = getGoogleHostWindow().google?.maps;

  if (!googleMaps?.places?.PlacesService) {
    return null;
  }

  return googleMaps;
}

export function ensurePlacesServiceContainer(): HTMLDivElement | null {
  if (typeof document === "undefined" || !document.body) {
    return null;
  }

  if (placesServiceContainer) {
    return placesServiceContainer;
  }

  placesServiceContainer = document.createElement("div");
  placesServiceContainer.style.display = "none";
  document.body.appendChild(placesServiceContainer);

  return placesServiceContainer;
}

function collectLonLatPairs(value: unknown, points: number[][] = []): number[][] {
  if (!Array.isArray(value)) {
    return points;
  }

  if (
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    points.push([value[0], value[1]]);
    return points;
  }

  for (const nestedValue of value) {
    collectLonLatPairs(nestedValue, points);
  }

  return points;
}

function isLonLatPair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  );
}

function normalizeRingCoordinates(value: unknown): [number, number][] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isLonLatPair);
}

function isPointOnSegment(
  point: SearchOrigin,
  start: [number, number],
  end: [number, number]
): boolean {
  const cross =
    (point.lon - start[0]) * (end[1] - start[1]) -
    (point.lat - start[1]) * (end[0] - start[0]);

  if (Math.abs(cross) > 1e-12) {
    return false;
  }

  const minLon = Math.min(start[0], end[0]);
  const maxLon = Math.max(start[0], end[0]);
  const minLat = Math.min(start[1], end[1]);
  const maxLat = Math.max(start[1], end[1]);

  return (
    point.lon >= minLon &&
    point.lon <= maxLon &&
    point.lat >= minLat &&
    point.lat <= maxLat
  );
}

function isPointInRing(point: SearchOrigin, ring: [number, number][]): boolean {
  if (ring.length < 3) {
    return false;
  }

  let inside = false;

  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];

    if (isPointOnSegment(point, current, next)) {
      return true;
    }

    const intersects =
      (current[1] > point.lat) !== (next[1] > point.lat) &&
      point.lon <
        ((next[0] - current[0]) * (point.lat - current[1])) /
          (next[1] - current[1]) +
          current[0];

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function isPointInPolygonCoordinates(
  point: SearchOrigin,
  coordinates: unknown
): boolean {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return false;
  }

  const outerRing = normalizeRingCoordinates(coordinates[0]);

  if (!isPointInRing(point, outerRing)) {
    return false;
  }

  for (let index = 1; index < coordinates.length; index += 1) {
    const holeRing = normalizeRingCoordinates(coordinates[index]);

    if (isPointInRing(point, holeRing)) {
      return false;
    }
  }

  return true;
}

export function getVenueSearchOrigin(venue: any): SearchOrigin | undefined {
  const geometry = venue?.geometry;

  if (!geometry) {
    return undefined;
  }

  if (
    (geometry.type === "Point" || geometry.type === "point") &&
    Array.isArray(geometry.coordinates)
  ) {
    const [lon, lat] = geometry.coordinates;

    if (typeof lon === "number" && typeof lat === "number") {
      return { lon, lat };
    }
  }

  const points = collectLonLatPairs(geometry.coordinates);

  if (points.length === 0) {
    return undefined;
  }

  let minLon = Number.POSITIVE_INFINITY;
  let maxLon = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const [lon, lat] of points) {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }

  return {
    lon: (minLon + maxLon) / 2,
    lat: (minLat + maxLat) / 2
  };
}

export function readLocation(location: unknown): SearchOrigin | undefined {
  if (!location || typeof location !== "object") {
    return undefined;
  }

  const typedLocation = location as Record<string, unknown>;
  const rawLat =
    typeof typedLocation.lat === "function"
      ? typedLocation.lat()
      : typedLocation.lat;
  const rawLng =
    typeof typedLocation.lng === "function"
      ? typedLocation.lng()
      : typedLocation.lng;

  if (typeof rawLat !== "number" || typeof rawLng !== "number") {
    return undefined;
  }

  return {
    lon: rawLng,
    lat: rawLat
  };
}

export function isLocationWithinVenueGeometry(
  venue: any,
  location: SearchOrigin
): boolean {
  const geometry = venue?.geometry;

  if (!geometry) {
    return false;
  }

  if (geometry.type === "Polygon" || geometry.type === "polygon") {
    return isPointInPolygonCoordinates(location, geometry.coordinates);
  }

  if (geometry.type === "MultiPolygon" || geometry.type === "multipolygon") {
    if (!Array.isArray(geometry.coordinates)) {
      return false;
    }

    return geometry.coordinates.some((polygonCoordinates: unknown) =>
      isPointInPolygonCoordinates(location, polygonCoordinates)
    );
  }

  return false;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function calculateDistanceMeters(
  origin: SearchOrigin,
  target: SearchOrigin
): number {
  const earthRadius = 6371000;
  const deltaLat = toRadians(target.lat - origin.lat);
  const deltaLon = toRadians(target.lon - origin.lon);
  const originLat = toRadians(origin.lat);
  const targetLat = toRadians(target.lat);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(originLat) *
      Math.cos(targetLat) *
      Math.sin(deltaLon / 2) ** 2;

  return Math.round(
    earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}

export function isOkPlaceDetailsStatus(status: unknown, googleMaps: any): boolean {
  const placesStatus = googleMaps?.places?.PlacesServiceStatus;

  return status === "OK" || status === placesStatus?.OK;
}

export function isNotFoundPlaceDetailsStatus(
  status: unknown,
  googleMaps: any
): boolean {
  const placesStatus = googleMaps?.places?.PlacesServiceStatus;

  return (
    status === "NOT_FOUND" ||
    status === placesStatus?.NOT_FOUND ||
    status === "INVALID_REQUEST" ||
    status === placesStatus?.INVALID_REQUEST ||
    status === "ZERO_RESULTS" ||
    status === placesStatus?.ZERO_RESULTS
  );
}

export function runPlaceDetailsLookup(
  service: any,
  request: Record<string, unknown>
): Promise<{ result: any; status: unknown }> {
  return new Promise((resolve) => {
    service.getDetails(request, (result: any, status: unknown) => {
      resolve({ result, status });
    });
  });
}
