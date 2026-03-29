import { getCountryCodeCandidates, normalizeCountryCode } from "../../config/country-code";
import { getWmeSdk } from "./wme";

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  netherlands: "nl",
  nederland: "nl",
  "the netherlands": "nl"
};

const COUNTRY_ALPHA_FIELDS = [
  "code",
  "abbr",
  "iso2",
  "iso",
  "iso3",
  "alpha2",
  "alpha3",
  "countryCode",
  "isoCode",
  "id",
  "countryId",
  "countryID"
];

const COUNTRY_NAME_FIELDS = [
  "name",
  "fullName",
  "displayName"
];

function normalizeAlphaCountryCode(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = normalizeCountryCode(value);
  if (!normalized) {
    return undefined;
  }

  if (!/^[a-z]{2,3}$/.test(normalized)) {
    return undefined;
  }

  const candidates = getCountryCodeCandidates(normalized);
  return candidates[0];
}

function resolveCountryCodeFromName(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const key = value.trim().toLowerCase();
  return COUNTRY_NAME_TO_CODE[key];
}

function resolveCountryCodeFromRecord(record: Record<string, unknown>): string | undefined {
  for (const field of COUNTRY_ALPHA_FIELDS) {
    const candidate = normalizeAlphaCountryCode(record[field]);
    if (candidate) {
      return candidate;
    }
  }

  for (const field of COUNTRY_NAME_FIELDS) {
    const candidate = resolveCountryCodeFromName(record[field]);
    if (candidate) {
      return candidate;
    }
  }

  return undefined;
}

function resolveCountryCodeFromObject(country: any): string | undefined {
  if (!country || typeof country !== "object") {
    return undefined;
  }

  return resolveCountryCodeFromRecord(country as Record<string, unknown>);
}

export function resolveCountryCodeFromCountryEntity(country: any): string | undefined {
  const fromObject = resolveCountryCodeFromObject(country);
  if (fromObject) {
    return fromObject;
  }

  return normalizeAlphaCountryCode(country);
}

function isNumericLike(value: unknown): boolean {
  return (
    typeof value === "number" ||
    (typeof value === "string" && /^[0-9]+$/.test(value.trim()))
  );
}

function normalizeNumericLike(value: unknown): number | string | undefined {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && /^[0-9]+$/.test(value.trim())) {
    return Number(value);
  }

  return undefined;
}

function findCountryById(countryId: unknown): any {
  const sdk = getWmeSdk();
  const countries = sdk?.DataModel?.Countries;

  if (!countries || !isNumericLike(countryId)) {
    return undefined;
  }

  const normalizedId = normalizeNumericLike(countryId);
  if (normalizedId === undefined) {
    return undefined;
  }

  const lookups = [
    () => countries.getById?.({ countryId: normalizedId }),
    () => countries.getById?.({ id: normalizedId }),
    () => countries.getById?.(normalizedId)
  ];

  for (const lookup of lookups) {
    try {
      const result = lookup();
      if (result) {
        return result;
      }
    } catch {
      // Ignore shape mismatch and continue with next lookup variant.
    }
  }

  const allCountries = countries.getAll?.();
  if (!Array.isArray(allCountries)) {
    return undefined;
  }

  return allCountries.find((country: any) => {
    const id =
      country?.id ??
      country?.countryId ??
      country?.attributes?.id ??
      country?.attributes?.countryId;
    if (typeof id === "number" && typeof normalizedId === "number") {
      return id === normalizedId;
    }

    if (typeof id === "string") {
      return id.trim() === String(normalizedId);
    }

    return false;
  });
}

export function resolveCountryCodeFromCountryId(countryId: unknown): string | undefined {
  const country = findCountryById(countryId);
  return resolveCountryCodeFromCountryEntity(country);
}

export function resolveVenueCountryCode(venue: any): string | undefined {
  const sdk = getWmeSdk();
  const venueId =
    typeof venue?.id === "string" && venue.id.trim().length > 0
      ? venue.id
      : undefined;

  if (!sdk || !venueId) {
    return undefined;
  }

  try {
    const address = sdk.DataModel?.Venues?.getAddress?.({ venueId });
    return resolveCountryCodeFromCountryEntity(address?.country);
  } catch {
    return undefined;
  }
}
