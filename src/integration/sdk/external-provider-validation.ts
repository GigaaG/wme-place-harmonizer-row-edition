import { logger } from "../../logging/logger.ts";
import type { PlaceIssue } from "../../types/issue.ts";
import type { PlaceProposal } from "../../types/proposal.ts";
import {
  buildOpeningHoursValueFromNormalizedSlots,
  formatOpeningHoursDisplay,
  normalizeCurrentOpeningHours,
  normalizeGoogleOpeningHours
} from "./external-provider-validation-hours.ts";
import {
  calculateDistanceMeters,
  ensurePlacesServiceContainer,
  getGoogleMapsApi,
  isLocationWithinVenueGeometry,
  getVenueSearchOrigin,
  isNotFoundPlaceDetailsStatus,
  isOkPlaceDetailsStatus,
  readLocation,
  runPlaceDetailsLookup
} from "./external-provider-validation-google.ts";
import {
  buildExternalProviderValidationFindings,
  isExternalProviderValidationRuleId
} from "./external-provider-validation-rules.ts";
import { scoreExternalProviderName } from "./external-provider-suggestions.ts";
import type {
  LinkedExternalProviderValidationParams,
  ExternalProviderValidationFinding
} from "./external-provider-validation-types.ts";
import {
  normalizeBusinessStatus,
  trimString
} from "./external-provider-validation-utils.ts";
import { getCurrentWmeLocale } from "./wme.ts";
import { normalizeLocaleCode } from "../../i18n/locale-utils.ts";

function hasEnabledValidationChecks(
  settings: LinkedExternalProviderValidationParams["settings"]
): boolean {
  if (settings?.enabled === false) {
    return false;
  }

  if (!settings?.checks) {
    return true;
  }

  return Object.values(settings.checks).some(Boolean);
}

const GOOGLE_PLACE_DETAILS_FIELDS = [
  "place_id",
  "name",
  "formatted_address",
  "geometry",
  "url",
  "types",
  "business_status",
  "permanently_closed",
  "opening_hours"
];

function appendLocaleCandidates(
  locales: string[],
  seen: Set<string>,
  locale: string | undefined
): void {
  const normalized = normalizeLocaleCode(locale);

  if (!normalized) {
    return;
  }

  const variants = [normalized];
  const separatorIndex = normalized.indexOf("-");

  if (separatorIndex > 0) {
    variants.push(normalized.slice(0, separatorIndex));
  }

  for (const variant of variants) {
    if (seen.has(variant)) {
      continue;
    }

    seen.add(variant);
    locales.push(variant);
  }
}

function resolveGooglePlaceNameLocales(
  params: LinkedExternalProviderValidationParams
): string[] {
  // Prefer explicit Google name locales from config, then fall back to the
  // current WME locale and English. This keeps multilingual countries under
  // config control instead of hard-coding a single language.
  const locales: string[] = [];
  const seen = new Set<string>();

  for (const locale of params.config?.nameLocales ?? []) {
    appendLocaleCandidates(locales, seen, locale);
  }

  appendLocaleCandidates(locales, seen, getCurrentWmeLocale());
  appendLocaleCandidates(locales, seen, "en");

  return locales;
}

interface ResolvedGooglePlaceDetails {
  result?: any;
  status: unknown;
  language?: string;
}

async function runLocalizedPlaceDetailsLookup(params: {
  service: any;
  googleMaps: any;
  providerId: string;
  venueName: string;
  locales: string[];
}): Promise<ResolvedGooglePlaceDetails> {
  let bestMatch:
    | (ResolvedGooglePlaceDetails & { score: number; placeName?: string })
    | undefined;
  let lastStatus: unknown;
  let notFoundStatus: unknown;

  const locales = params.locales.length > 0 ? params.locales : [undefined];

  for (const locale of locales) {
    const detailsRequest: Record<string, unknown> = {
      placeId: params.providerId,
      fields: GOOGLE_PLACE_DETAILS_FIELDS
    };

    if (locale) {
      detailsRequest.language = locale;
    }

    const { result, status } = await runPlaceDetailsLookup(
      params.service,
      detailsRequest
    );

    lastStatus = status;

    if (isOkPlaceDetailsStatus(status, params.googleMaps)) {
      const placeName = trimString(result?.name);
      const score = placeName
        ? scoreExternalProviderName(params.venueName, placeName)
        : 0;
      const currentMatch = {
        result,
        status,
        language: locale,
        placeName,
        score
      };

      if (!bestMatch || currentMatch.score > bestMatch.score) {
        bestMatch = currentMatch;
      }

      if (currentMatch.score >= 1) {
        break;
      }
    } else if (
      isNotFoundPlaceDetailsStatus(status, params.googleMaps) &&
      notFoundStatus === undefined
    ) {
      notFoundStatus = status;
    }
  }

  if (bestMatch) {
    return {
      result: bestMatch.result,
      status: bestMatch.status,
      language: bestMatch.language
    };
  }

  if (notFoundStatus !== undefined) {
    return {
      result: undefined,
      status: notFoundStatus
    };
  }

  return {
    result: undefined,
    status: lastStatus
  };
}

export { buildExternalProviderValidationFindings, isExternalProviderValidationRuleId };

export async function validateLinkedExternalProviders(
  params: LinkedExternalProviderValidationParams
): Promise<{
  issues: PlaceIssue[];
  proposals: PlaceProposal[];
}> {
  const uniqueProviderIds = Array.from(
    new Set(
      params.externalProviderIds
        .map((providerId) => trimString(providerId))
        .filter((providerId): providerId is string => !!providerId)
    )
  );

  if (
    uniqueProviderIds.length === 0 ||
    typeof window === "undefined" ||
    params.settings?.enabled === false ||
    !hasEnabledValidationChecks(params.settings)
  ) {
    return {
      issues: [],
      proposals: []
    };
  }

  const googleMaps = getGoogleMapsApi();

  if (!googleMaps) {
    logger.info(
      "Google Places service unavailable on host window; skipping linked external provider validation"
    );
    return {
      issues: [],
      proposals: []
    };
  }

  const container = ensurePlacesServiceContainer();

  if (!container) {
    logger.warn(
      "Cannot initialize Google Places container for linked external provider validation"
    );
    return {
      issues: [],
      proposals: []
    };
  }

  const venueOrigin = getVenueSearchOrigin(params.venue);
  const normalizedCurrentOpeningHours = normalizeCurrentOpeningHours(
    params.currentOpeningHours ?? []
  );
  const googleNameLocales = resolveGooglePlaceNameLocales(params);

  logger.info(
    `Validating ${uniqueProviderIds.length} linked external provider(s) for venue "${params.venueName}"` +
      (venueOrigin
        ? ` at ${venueOrigin.lat.toFixed(6)},${venueOrigin.lon.toFixed(6)}`
        : " without usable venue geometry")
  );

  const service = new googleMaps.places.PlacesService(container);
  const issues: PlaceIssue[] = [];
  const proposals: PlaceProposal[] = [];

  for (const providerId of uniqueProviderIds) {
    logger.info(`Validating linked external provider ${providerId}`);

    const { result, status, language } = await runLocalizedPlaceDetailsLookup({
      service,
      googleMaps,
      providerId,
      venueName: params.venueName,
      locales: googleNameLocales
    });

    let findings: ExternalProviderValidationFinding[] = [];

    if (isOkPlaceDetailsStatus(status, googleMaps)) {
      const placeLocation = readLocation(result?.geometry?.location);
      const isWithinVenueGeometry =
        placeLocation && params.venue
          ? isLocationWithinVenueGeometry(params.venue, placeLocation)
          : false;
      const distanceMeters =
        venueOrigin && placeLocation && !isWithinVenueGeometry
          ? calculateDistanceMeters(venueOrigin, placeLocation)
          : undefined;
      const googleOpeningHours = normalizeGoogleOpeningHours(
        result?.opening_hours
      );
      const googleOpeningHoursValue = buildOpeningHoursValueFromNormalizedSlots(
        googleOpeningHours
      );
      const googleOpeningHoursDisplay = formatOpeningHoursDisplay(
        Array.isArray(result?.opening_hours?.weekday_text)
          ? result.opening_hours.weekday_text
          : undefined,
        googleOpeningHours
      );

      logger.info(
        `Linked provider ${providerId} resolved: language=${language ?? "default"}, name=${trimString(result?.name) ?? "none"}, status=${normalizeBusinessStatus(result?.business_status) ?? (result?.permanently_closed ? "CLOSED_PERMANENTLY" : "none")}, distance=${distanceMeters ?? "n/a"}, withinVenueGeometry=${isWithinVenueGeometry}, types=${Array.isArray(result?.types) ? result.types.join(",") : "none"}, openingHours=${googleOpeningHours ? googleOpeningHours.length : "unsupported"}`
      );

      findings = buildExternalProviderValidationFindings(
        {
          providerId,
          venueName: params.venueName,
          placeName: trimString(result?.name),
          address: trimString(result?.formatted_address),
          url: trimString(result?.url),
          distanceMeters,
          currentCategories: params.currentCategories ?? [],
          googleTypes: Array.isArray(result?.types) ? result.types : [],
          currentOpeningHours: params.currentOpeningHours ?? [],
          googleOpeningHours,
          googleOpeningHoursValue,
          googleOpeningHoursDisplay,
          businessStatus:
            normalizeBusinessStatus(result?.business_status) ??
            (result?.permanently_closed ? "permanently_closed" : undefined)
        },
        params.settings,
        params.config
      );

      if (
        params.settings?.checks?.openingHours !== false &&
        normalizedCurrentOpeningHours === null
      ) {
        logger.warn(
          `Linked provider ${providerId}: current WME opening hours could not be normalized for comparison`
        );
      }

      if (
        params.settings?.checks?.openingHours !== false &&
        googleOpeningHours === null
      ) {
        logger.warn(
          `Linked provider ${providerId}: Google opening hours could not be normalized for comparison`
        );
      }
    } else if (isNotFoundPlaceDetailsStatus(status, googleMaps)) {
      logger.info(`Linked provider ${providerId} could not be resolved: ${String(status)}`);
      findings = buildExternalProviderValidationFindings(
        {
          providerId,
          venueName: params.venueName,
          notFound: true
        },
        params.settings,
        params.config
      );
    } else {
      logger.warn(
        `Linked external provider validation failed for ${providerId}: ${String(status)}`
      );
    }

    if (findings.length > 0) {
      for (const finding of findings) {
        logger.info(
          `Linked provider ${providerId} validation issue: ${finding.issue.ruleId} (${finding.issue.severity})`
        );
        issues.push(finding.issue);
        proposals.push(finding.proposal);
      }
    } else {
      logger.info(`Linked provider ${providerId} validation passed`);
    }
  }

  return {
    issues,
    proposals
  };
}
