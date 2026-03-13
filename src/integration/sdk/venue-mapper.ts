import type { PlaceLike, GeometryType, OpeningHourDefinition } from "../../types/place";
import type { PlaceAddress } from "../../types/address";
import { normalizeCategoryKeys } from "../../config/category-key";
import { resolveVenueCountryCode } from "./venue-country";
import { getWmeSdk } from "./wme";

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

function readStringValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function firstString(...candidates: unknown[]): string | undefined {
  for (const candidate of candidates) {
    const value = readStringValue(candidate);
    if (value) {
      return value;
    }
  }

  return undefined;
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

function mapCategories(venue: any): string[] {
  return normalizeCategoryKeys([
    ...(Array.isArray(venue?.categories) ? venue.categories : []),
    ...(Array.isArray(venue?.attributes?.categories)
      ? venue.attributes.categories
      : []),
    venue?.primaryCategory,
    venue?.category,
    venue?.attributes?.primaryCategory,
    venue?.attributes?.category
  ]);
}

function getVenueAddressFromSdk(venue: any): any | undefined {
  const sdk = getWmeSdk();
  const venueId = venue?.id ?? venue?.attributes?.id;

  if (!sdk || venueId === undefined || venueId === null) {
    return undefined;
  }

  try {
    return sdk.DataModel?.Venues?.getAddress?.({ venueId });
  } catch {
    // Fall through to compatibility fallback.
  }

  try {
    return sdk.DataModel?.Venues?.getAddress?.(venueId);
  } catch {
    return undefined;
  }
}

function mapAddress(venue: any): PlaceAddress | undefined {
  const sdkAddress = getVenueAddressFromSdk(venue);

  const address = {
    city: firstString(
      sdkAddress?.city?.name,
      sdkAddress?.cityName,
      sdkAddress?.city,
      venue?.address?.city?.name,
      venue?.address?.cityName,
      venue?.address?.city,
      venue?.attributes?.address?.city?.name,
      venue?.attributes?.address?.cityName,
      venue?.attributes?.address?.city,
      venue?.city?.name,
      venue?.city,
      venue?.attributes?.city?.name,
      venue?.attributes?.city
    ),
    street: firstString(
      sdkAddress?.street?.name,
      sdkAddress?.street?.englishName,
      sdkAddress?.streetName,
      sdkAddress?.street,
      venue?.address?.street?.name,
      venue?.address?.streetName,
      venue?.address?.street,
      venue?.attributes?.address?.street?.name,
      venue?.attributes?.address?.streetName,
      venue?.attributes?.address?.street,
      venue?.street?.name,
      venue?.street,
      venue?.attributes?.street?.name,
      venue?.attributes?.street
    ),
    houseNumber: firstString(
      sdkAddress?.houseNumber,
      sdkAddress?.house_number,
      sdkAddress?.housenumber,
      venue?.address?.houseNumber,
      venue?.address?.housenumber,
      venue?.address?.house_number,
      venue?.attributes?.address?.houseNumber,
      venue?.attributes?.address?.housenumber,
      venue?.attributes?.address?.house_number,
      venue?.houseNumber,
      venue?.attributes?.houseNumber
    )
  };

  return address.city || address.street || address.houseNumber
    ? address
    : undefined;
}

export function mapVenueToPlaceLike(venue: any): PlaceLike {
  return {
    name: venue.name ?? "",
    categories: mapCategories(venue),
    brand: venue.brand ?? undefined,
    aliases: venue.aliases ?? [],

    phone: venue.phone ?? undefined,
    url: venue.url ?? undefined,

    geometry: mapGeometry(venue.geometry),
    lockLevel: mapLockLevel(venue),

    services: venue.services ?? [],

    openingHours: mapOpeningHours(venue.openingHours),
    externalProviderIds: venue.externalProviderIds ?? [],
    address: mapAddress(venue),

    country: resolveVenueCountryCode(venue)
  };
}
