import { getWmeSdk } from "./wme";

type BBox = [number, number, number, number];
interface Bounds {
  left: number;
  bottom: number;
  right: number;
  top: number;
}

function isCoordinateInsideExtent(
  lon: number,
  lat: number,
  extent: BBox
): boolean {
  const [left, bottom, right, top] = extent;

  return lon >= left &&
    lon <= right &&
    lat >= bottom &&
    lat <= top;
}

function getBoundsForPolygonCoordinates(coordinates: number[][][]): Bounds | null {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return null;
  }

  const outerRing = coordinates[0];

  if (!Array.isArray(outerRing) || outerRing.length === 0) {
    return null;
  }

  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.POSITIVE_INFINITY;
  let top = Number.NEGATIVE_INFINITY;
  let hasPoint = false;

  for (const point of outerRing) {
    const [lon, lat] = point ?? [];

    if (typeof lon !== "number" || typeof lat !== "number") {
      continue;
    }

    left = Math.min(left, lon);
    right = Math.max(right, lon);
    bottom = Math.min(bottom, lat);
    top = Math.max(top, lat);
    hasPoint = true;
  }

  if (!hasPoint) {
    return null;
  }

  return {
    left,
    bottom,
    right,
    top
  };
}

function intersectsExtent(bounds: Bounds, extent: BBox): boolean {
  const [extentLeft, extentBottom, extentRight, extentTop] = extent;

  return (
    bounds.right >= extentLeft &&
    bounds.left <= extentRight &&
    bounds.top >= extentBottom &&
    bounds.bottom <= extentTop
  );
}

function isVenueVisible(venue: any, extent: BBox): boolean {
  const geometry = venue.geometry;

  if (!geometry) {
    return false;
  }

  if (geometry.type === "Point" || geometry.type === "point") {
    const [lon, lat] = geometry.coordinates ?? [];
    if (typeof lon === "number" && typeof lat === "number") {
      return isCoordinateInsideExtent(lon, lat, extent);
    }

    return false;
  }

  if (geometry.type === "Polygon" || geometry.type === "polygon") {
    const polygonBounds = getBoundsForPolygonCoordinates(geometry.coordinates);
    return !!polygonBounds && intersectsExtent(polygonBounds, extent);
  }

  if (geometry.type === "MultiPolygon" || geometry.type === "multipolygon") {
    const polygons = geometry.coordinates;

    if (!Array.isArray(polygons)) {
      return false;
    }

    for (const polygonCoordinates of polygons) {
      const polygonBounds = getBoundsForPolygonCoordinates(polygonCoordinates);

      if (polygonBounds && intersectsExtent(polygonBounds, extent)) {
        return true;
      }
    }

    return false;
  }

  return false;
}

export function getVisibleVenues(): any[] {
  const sdk = getWmeSdk();

  if (!sdk) {
    return [];
  }

  const extent = sdk.Map.getMapExtent() as BBox;
  const allVenues = sdk.DataModel.Venues.getAll();

  if (!extent || !Array.isArray(allVenues)) {
    return [];
  }

  return allVenues.filter((venue: any) => isVenueVisible(venue, extent));
}
