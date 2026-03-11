import { mapVenueToPlaceLike } from "../integration/sdk/venue-mapper";
import { matchPlaceToChain } from "../matching/chain-matcher";
import { resolveCategoryStandards } from "../config/category-standards";
import { resolveEffectivePolicy } from "../config/effective-policy";
import { evaluatePlace } from "../rules/evaluate-place";
import type { VisibleVenueScanSummary, ScannedVenueResult } from "../types/scan";

export function scanVisibleVenues(params: {
  venues: any[];
  runtimeConfig: any;
  runtimeChains: any;
}): VisibleVenueScanSummary {
  const { venues, runtimeConfig, runtimeChains } = params;

  const results: ScannedVenueResult[] = [];

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

    const issues = evaluatePlace(place, effectivePolicy, matchResult.chain);

    const hasErrors = issues.some((issue) => issue.severity === "error");
    const hasWarnings = issues.some((issue) => issue.severity === "warning");

    if (hasErrors) {
      error += 1;
    } else if (hasWarnings) {
      warning += 1;
    } else {
      ok += 1;
    }

    results.push({
      venueId: venue.id,
      name: place.name,
      issueCount: issues.length,
      hasErrors,
      hasWarnings
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