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
import type {
  LinkedExternalProviderValidationParams,
  ExternalProviderValidationFinding
} from "./external-provider-validation-types.ts";
import {
  normalizeBusinessStatus,
  trimString
} from "./external-provider-validation-utils.ts";

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

    const { result, status } = await runPlaceDetailsLookup(service, {
      placeId: providerId,
      fields: [
        "place_id",
        "name",
        "formatted_address",
        "geometry",
        "url",
        "types",
        "business_status",
        "permanently_closed",
        "opening_hours"
      ]
    });

    let findings: ExternalProviderValidationFinding[] = [];

    if (isOkPlaceDetailsStatus(status, googleMaps)) {
      const placeLocation = readLocation(result?.geometry?.location);
      const distanceMeters =
        venueOrigin && placeLocation
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
        `Linked provider ${providerId} resolved: name=${trimString(result?.name) ?? "none"}, status=${normalizeBusinessStatus(result?.business_status) ?? (result?.permanently_closed ? "CLOSED_PERMANENTLY" : "none")}, distance=${distanceMeters ?? "n/a"}, types=${Array.isArray(result?.types) ? result.types.join(",") : "none"}, openingHours=${googleOpeningHours ? googleOpeningHours.length : "unsupported"}`
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
