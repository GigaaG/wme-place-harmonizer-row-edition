import type { PlaceLike, GeometryType, OpeningHourDefinition } from "../../types/place";

function mapGeometry(geometry: any): GeometryType | undefined {
  if (geometry?.type === "Point" || geometry?.type === "point") {
    return "point";
  }

  if (geometry?.type === "Polygon" || geometry?.type === "polygon") {
    return "polygon";
  }

  return undefined;
}

function mapOpeningHours(openingHours: any[] | undefined): OpeningHourDefinition[] {
  if (!Array.isArray(openingHours)) {
    return [];
  }

  return openingHours
    .filter((entry) => entry && Array.isArray(entry.days))
    .map((entry) => ({
      days: entry.days,
      fromHour: entry.fromHour,
      toHour: entry.toHour
    }));
}

export function mapVenueToPlaceLike(venue: any): PlaceLike {
  return {
    name: venue.name ?? "",
    categories: venue.categories ?? [],
    brand: venue.brand ?? undefined,
    aliases: venue.aliases ?? [],

    phone: venue.phone ?? undefined,
    url: venue.url ?? undefined,

    geometry: mapGeometry(venue.geometry),

    services: venue.services ?? [],

    openingHours: mapOpeningHours(venue.openingHours),
    externalProviderIds: venue.externalProviderIds ?? [],

    country: venue.address?.country?.id ?? undefined
  };
}