import { getWmeSdk } from "./wme";

type BBox = [number, number, number, number];

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

function getVenueCenter(venue: any): { lon: number; lat: number } | null {
  const geometry = venue.geometry;

  if (!geometry) {
    return null;
  }

  if (geometry.type === "Point" || geometry.type === "point") {
    const [lon, lat] = geometry.coordinates ?? [];

    if (typeof lon === "number" && typeof lat === "number") {
      return { lon, lat };
    }
  }

  if (geometry.type === "Polygon" || geometry.type === "polygon") {
    const ring = geometry.coordinates?.[0];

    if (!Array.isArray(ring) || ring.length === 0) {
      return null;
    }

    let lonSum = 0;
    let latSum = 0;
    let count = 0;

    for (const point of ring) {
      const [lon, lat] = point ?? [];

      if (typeof lon === "number" && typeof lat === "number") {
        lonSum += lon;
        latSum += lat;
        count += 1;
      }
    }

    if (count > 0) {
      return {
        lon: lonSum / count,
        lat: latSum / count
      };
    }
  }

  return null;
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

  return allVenues.filter((venue: any) => {
    const center = getVenueCenter(venue);

    if (!center) {
      return false;
    }

    return isCoordinateInsideExtent(center.lon, center.lat, extent);
  });
}