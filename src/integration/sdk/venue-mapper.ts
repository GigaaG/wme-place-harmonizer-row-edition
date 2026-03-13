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
  const lockRank = readNumericValue(venue?.lockRank);

  return typeof lockRank === "number" &&
    Number.isInteger(lockRank) &&
    lockRank >= 0
    ? lockRank + 1
    : undefined;
}

function mapCategories(venue: any): string[] {
  return normalizeCategoryKeys(
    Array.isArray(venue?.categories) ? venue.categories : []
  );
}

function getVenueAddressFromSdk(venue: any): any | undefined {
  const sdk = getWmeSdk();
  const venueId = readStringValue(venue?.id);

  if (!sdk || !venueId) {
    return undefined;
  }

  try {
    return sdk.DataModel?.Venues?.getAddress?.({ venueId });
  } catch {
    return undefined;
  }
}

function mapAddress(venue: any): PlaceAddress | undefined {
  const sdkAddress = getVenueAddressFromSdk(venue);
  if (!sdkAddress || sdkAddress.isEmpty) {
    return undefined;
  }

  const address = {
    city: readStringValue(sdkAddress.city?.name),
    street: firstString(
      sdkAddress.street?.name,
      sdkAddress.street?.englishName
    ),
    houseNumber: readStringValue(sdkAddress.houseNumber)
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
