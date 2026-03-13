import type { PlaceLike } from "../types/place";
import type { EffectivePlacePolicy } from "../types/policy";
import type { PlaceIssue } from "../types/issue";
import type { ChainRecord } from "../types/chains";

function arraysEqual(a: string[] = [], b: string[] = []): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const left = [...a].sort();
  const right = [...b].sort();

  return left.every((value, index) => value === right[index]);
}

function normalizeExternalProviderIds(ids: string[] | undefined): string[] {
  if (!Array.isArray(ids)) {
    return [];
  }

  return Array.from(
    new Set(
      ids
        .map((id) => String(id).trim())
        .filter((id) => id.length > 0)
    )
  );
}

export function evaluatePlace(
  place: PlaceLike,
  policy: EffectivePlacePolicy,
  chain?: ChainRecord
): PlaceIssue[] {
  const issues: PlaceIssue[] = [];
  const externalProviderIds = normalizeExternalProviderIds(
    place.externalProviderIds
  );
  const hasExternalProviders = externalProviderIds.length > 0;

  //
  // NAME
  //

  const expectedName = chain?.standard?.name;
  if (expectedName && place.name.trim() !== expectedName.trim()) {
    issues.push({
      field: "name",
      severity: "warning",
      message: `Name should be "${expectedName}"`,
      currentValue: place.name,
      expectedValue: expectedName,
      ruleId: "nameNormalization"
    });
  }

  //
  // GEOMETRY
  //

  if (policy.geometry && place.geometry) {
    if (policy.geometry.required && place.geometry !== policy.geometry.required) {
      issues.push({
        field: "geometry",
        severity: "error",
        message: `Geometry must be ${policy.geometry.required}`,
        currentValue: place.geometry,
        expectedValue: policy.geometry.required,
        ruleId: "geometry.required"
      });
    } else if (
      policy.geometry.recommended &&
      place.geometry !== policy.geometry.recommended
    ) {
      issues.push({
        field: "geometry",
        severity: "warning",
        message: `Geometry should be ${policy.geometry.recommended}`,
        currentValue: place.geometry,
        expectedValue: policy.geometry.recommended,
        ruleId: "geometry.recommended"
      });
    }
  }

  //
  // LOCK LEVEL
  //

  if (
    policy.lockLevel !== undefined &&
    place.lockLevel !== undefined &&
    place.lockLevel < policy.lockLevel
  ) {
    issues.push({
      field: "lockLevel",
      severity: "warning",
      message: `Lock level should be at least ${policy.lockLevel}`,
      currentValue: place.lockLevel,
      expectedValue: policy.lockLevel,
      ruleId: "lockLevelRecommendation"
    });
  }

  //
  // PHONE
  //

  if (policy.requirePhone) {
    if (!place.phone || place.phone.trim().length === 0) {
      issues.push({
        field: "phone",
        severity: "error",
        message: "Phone number is required",
        ruleId: "phoneValidation"
      });
    }
  }

  //
  // URL
  //

  if (policy.requireUrl) {
    if (!place.url || place.url.trim().length === 0) {
      issues.push({
        field: "url",
        severity: "error",
        message: "URL is required",
        ruleId: "urlValidation"
      });
    }
  }

  const expectedUrl = chain?.standard?.url;
  if (expectedUrl && (place.url ?? "").trim() !== expectedUrl.trim()) {
    issues.push({
      field: "url",
      severity: "warning",
      message: `URL should be "${expectedUrl}"`,
      currentValue: place.url,
      expectedValue: expectedUrl,
      ruleId: "urlNormalization"
    });
  }

  //
  // OPENING HOURS
  //

  if (policy.requireOpeningHours) {
    if (!place.openingHours || place.openingHours.length === 0) {
      issues.push({
        field: "openingHours",
        severity: "error",
        message: "Opening hours are required",
        ruleId: "openingHours.required"
      });
    }
  }

  const expectedOpeningHours = chain?.standard?.openingHoursTemplate;
  if (
    expectedOpeningHours &&
    place.openingHours &&
    place.openingHours.length > 0
  ) {
    const normalizeHours = (hours: typeof expectedOpeningHours) =>
      hours.map((entry) => JSON.stringify(entry)).sort();

    const current = normalizeHours(place.openingHours);
    const expected = normalizeHours(expectedOpeningHours);

    if (!arraysEqual(current, expected)) {
      issues.push({
        field: "openingHours",
        severity: "warning",
        message: "Opening hours differ from the chain template",
        currentValue: place.openingHours,
        expectedValue: expectedOpeningHours,
        ruleId: "openingHours.template"
      });
    }
  }

  //
  // EXTERNAL PROVIDER IDS
  //

  if (policy.requireExternalProvider === true && !hasExternalProviders) {
    issues.push({
      field: "externalProviderIds",
      severity: "error",
      message: "At least one external provider id is required",
      currentValue: externalProviderIds,
      ruleId: "externalProvider.required"
    });
  }

  if (policy.requireExternalProvider === false && hasExternalProviders) {
    issues.push({
      field: "externalProviderIds",
      severity: "error",
      message: "Venue should not have external providers",
      currentValue: externalProviderIds,
      expectedValue: [],
      ruleId: "externalProvider.forbidden"
    });
  }

  const expectedExternalProviderIds = chain?.standard?.externalProviderIds;
  if (
    expectedExternalProviderIds &&
    (expectedExternalProviderIds.length === 0
      ? hasExternalProviders
      : !expectedExternalProviderIds.every((id) =>
          externalProviderIds.includes(id)
        ))
  ) {
    issues.push({
      field: "externalProviderIds",
      severity: "warning",
      message: "External provider ids differ from the chain standard",
      currentValue: externalProviderIds,
      expectedValue: expectedExternalProviderIds,
      ruleId: "externalProvider.match"
    });
  }

  //
  // SERVICES
  //

  if (policy.services) {
    const services = place.services ?? [];

    if (policy.services.required) {
      for (const required of policy.services.required) {
        if (!services.includes(required)) {
          issues.push({
            field: "services",
            severity: "error",
            message: `Required service missing: ${required}`,
            currentValue: services,
            expectedValue: required,
            ruleId: `services.required.${required}`
          });
        }
      }
    }

    if (policy.services.recommended) {
      for (const recommended of policy.services.recommended) {
        if (!services.includes(recommended)) {
          issues.push({
            field: "services",
            severity: "warning",
            message: `Recommended service missing: ${recommended}`,
            currentValue: services,
            expectedValue: recommended,
            ruleId: `services.recommended.${recommended}`
          });
        }
      }
    }

    if (policy.services.forbidden) {
      for (const forbidden of policy.services.forbidden) {
        if (services.includes(forbidden)) {
          issues.push({
            field: "services",
            severity: "error",
            message: `Forbidden service present: ${forbidden}`,
            currentValue: services,
            expectedValue: forbidden,
            ruleId: `services.forbidden.${forbidden}`
          });
        }
      }
    }
  }

  return issues;
}
