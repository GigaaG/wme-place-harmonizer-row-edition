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

function readNumericValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function readNumericMethodValue(target: any, methodName: string): number | undefined {
  const method = target?.[methodName];

  if (typeof method !== "function") {
    return undefined;
  }

  try {
    return readNumericValue(method.call(target));
  } catch {
    return undefined;
  }
}

function mapLockLevel(venue: any): number | undefined {
  const directCandidates = [
    readNumericValue(venue?.lockLevel),
    readNumericValue(venue?.attributes?.lockLevel),
    readNumericMethodValue(venue, "getLockLevel")
  ];

  for (const candidate of directCandidates) {
    if (
      typeof candidate === "number" &&
      Number.isInteger(candidate) &&
      candidate >= 1
    ) {
      return candidate;
    }
  }

  const lockRankCandidates = [
    readNumericValue(venue?.lockRank),
    readNumericValue(venue?.attributes?.lockRank),
    readNumericMethodValue(venue, "getLockRank")
  ];

  for (const candidate of lockRankCandidates) {
    if (
      typeof candidate === "number" &&
      Number.isInteger(candidate) &&
      candidate >= 0
    ) {
      return candidate + 1;
    }
  }

  return undefined;
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
    lockLevel: mapLockLevel(venue),

    services: venue.services ?? [],

    openingHours: mapOpeningHours(venue.openingHours),
    externalProviderIds: venue.externalProviderIds ?? [],

    country: venue.address?.country?.id ?? undefined
  };
}
