import { mapVenueToPlaceLike } from "../integration/sdk/venue-mapper";
import { matchPlaceToChain } from "../matching/chain-matcher";
import { resolveCategoryStandards } from "../config/category-standards";
import { resolveEffectivePolicy } from "../config/effective-policy";
import { validateLinkedExternalProviders } from "../integration/sdk/external-provider-validation";
import { evaluatePlace } from "../rules/evaluate-place";
import type { VisibleVenueScanSummary, ScannedVenueResult, ScanSeverity } from "../types/scan";
import type { GoogleMapsValidationSettings } from "../types/settings";
import type { WhitelistRuntimeSnapshot } from "../types/whitelist";
import {
  filterWhitelistedAnalysis,
  loadWhitelistStore
} from "../whitelist/manager";

export async function scanVisibleVenues(params: {
  venues: any[];
  runtimeConfig: any;
  runtimeChains: any;
  googleMapsValidationSettings?: GoogleMapsValidationSettings;
  whitelistRuntime?: WhitelistRuntimeSnapshot;
}): Promise<VisibleVenueScanSummary> {
  const { venues, runtimeConfig, runtimeChains, whitelistRuntime } = params;

  const results: ScannedVenueResult[] = [];
  const whitelistStore = whitelistRuntime ? loadWhitelistStore() : undefined;

  let ok = 0;
  let warning = 0;
  let error = 0;

  for (const venue of venues) {
    const place = mapVenueToPlaceLike(venue);
    const matchResult = matchPlaceToChain(place, runtimeChains);

    const categoryStandards = resolveCategoryStandards(
      runtimeConfig,
      place.categories ?? []
    );

    const effectivePolicy = resolveEffectivePolicy({
      categoryStandards,
      chainPolicy: matchResult.chain?.policy
    });

    const issues = evaluatePlace(place, effectivePolicy, matchResult.chain, {
      cityInVenueNameRule: runtimeConfig.rules?.cityInVenueName,
      phoneFormatting: runtimeConfig.formatting?.phone,
      urlFormatting: runtimeConfig.formatting?.url
    });
    const googleValidation =
      params.googleMapsValidationSettings?.enabled &&
      (place.externalProviderIds ?? []).length > 0
        ? await validateLinkedExternalProviders({
            venueName: place.name,
            externalProviderIds: place.externalProviderIds ?? [],
            venue,
            currentCategories: place.categories ?? [],
            currentOpeningHours: place.openingHours ?? [],
            settings: params.googleMapsValidationSettings,
            config: runtimeConfig.googleMapsValidation
          })
        : { issues: [], proposals: [] };
    const visibleIssues = whitelistRuntime
      ? filterWhitelistedAnalysis({
          placeId: String(venue.id),
          issues: [...issues, ...googleValidation.issues],
          proposals: [],
          runtime: whitelistRuntime,
          store: whitelistStore
        }).issues
      : [...issues, ...googleValidation.issues];

    const hasErrors = visibleIssues.some((issue) => issue.severity === "error");
    const hasWarnings = visibleIssues.some((issue) => issue.severity === "warning");

    let severity: ScanSeverity = "ok";

    if (hasErrors) {
      severity = "error";
      error += 1;
    } else if (hasWarnings) {
      severity = "warning";
      warning += 1;
    } else {
      severity = "ok";
      ok += 1;
    }

    results.push({
      venueId: venue.id,
      name: place.name,
      issueCount: visibleIssues.length,
      hasErrors,
      hasWarnings,
      severity
    });
  }

  return {
    total: venues.length,
    ok,
    warning,
    error,
    results
  };
}
