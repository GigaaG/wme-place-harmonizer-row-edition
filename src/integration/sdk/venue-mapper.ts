import type { PlaceLike, GeometryType, OpeningHourDefinition } from "../../types/place.ts";
import type { PlaceAddress } from "../../types/address.ts";
import { normalizeCategoryKeys } from "../../config/category-key.ts";
import { resolveCountryCodeFromCountryEntity } from "./venue-country.ts";
import { getWmeSdk } from "./wme.ts";

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

function mapNavigationPointCount(venue: any): number | undefined {
  const candidates = [venue?.navigationPoints, venue?.navigationPoint];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((point) => point !== null && point !== undefined).length;
    }

    if (candidate && typeof candidate === "object") {
      return 1;
    }
  }

  return undefined;
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

function mapAddressFromSdkAddress(sdkAddress: any): PlaceAddress | undefined {
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

function mapCountryFromSdkAddress(sdkAddress: any): string | undefined {
  if (!sdkAddress || sdkAddress.isEmpty) {
    return undefined;
  }

  return resolveCountryCodeFromCountryEntity(sdkAddress.country);
}

export function mapVenueToPlaceLike(venue: any): PlaceLike {
  const sdkAddress = getVenueAddressFromSdk(venue);

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
    navigationPointCount: mapNavigationPointCount(venue),
    externalProviderIds: venue.externalProviderIds ?? [],
    address: mapAddressFromSdkAddress(sdkAddress),

    country: mapCountryFromSdkAddress(sdkAddress)
  };
}
