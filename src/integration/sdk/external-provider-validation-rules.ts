import { t } from "../../i18n/runtime.ts";
import { getDefaultGoogleMapsValidationSeverities } from "../../settings/google-maps-validation-policy.ts";
import type { GoogleMapsValidationConfig } from "../../types/config.ts";
import type { IssueSeverity } from "../../types/issue.ts";
import type { PlaceProposal } from "../../types/proposal.ts";
import type {
  GoogleMapsValidationCheckKey,
  GoogleMapsValidationSettings
} from "../../types/settings.ts";
import {
  CATEGORY_GOOGLE_PLACE_TYPE_MAP,
  buildGoogleMapsPlaceUrl,
  scoreExternalProviderName
} from "./external-provider-suggestions.ts";
import {
  buildOpeningHoursValueFromNormalizedSlots,
  formatWmeOpeningHoursDisplay,
  isTwentyFourSevenNormalizedHours,
  normalizeCurrentOpeningHours
} from "./external-provider-validation-hours.ts";
import type {
  ExternalProviderValidationFinding,
  ExternalProviderValidationSnapshot
} from "./external-provider-validation-types.ts";
import {
  appendReasonDetail,
  buildValidationGroupKey,
  normalizeBusinessStatus,
  trimString
} from "./external-provider-validation-utils.ts";

const EXTERNAL_PROVIDER_VALIDATION_NAME_MATCH_THRESHOLD = 0.92;
const EXTERNAL_PROVIDER_VALIDATION_LOCATION_DRIFT_THRESHOLD_METERS = 250;
const EXTERNAL_PROVIDER_VALIDATION_RULE_ID_PREFIX = "externalProvider.validation.";

function normalizeGooglePlaceTypes(types: unknown): string[] {
  if (!Array.isArray(types)) {
    return [];
  }

  return Array.from(
    new Set(
      types
        .map((type) => trimString(type)?.toLowerCase())
        .filter((type): type is string => !!type)
    )
  ).sort();
}

function resolveExpectedGooglePlaceTypes(categories: string[] = []): string[] {
  const expectedTypes = new Set<string>();

  for (const category of categories) {
    for (const placeType of CATEGORY_GOOGLE_PLACE_TYPE_MAP[category] ?? []) {
      expectedTypes.add(placeType.toLowerCase());
    }
  }

  return Array.from(expectedTypes).sort();
}

function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function buildExternalProviderValidationProposal(params: {
  providerId: string;
  ruleId: string;
  field?: string;
  currentValue?: unknown;
  proposedValue?: unknown;
  displayCurrentValue?: string;
  displayProposedValue?: string;
  displayProposedValueUrl?: string;
  reason: string;
  isApplySupported?: boolean;
  actionType?: "set-field" | "manual-only";
}): PlaceProposal {
  return {
    id: `${params.ruleId}:${params.providerId}`,
    field: params.field ?? "externalProviderIds",
    groupKey: buildValidationGroupKey(params.providerId, params.ruleId),
    currentValue: params.currentValue ?? params.providerId,
    displayCurrentValue: params.displayCurrentValue ?? params.providerId,
    proposedValue: params.proposedValue ?? params.displayProposedValue,
    displayProposedValue: params.displayProposedValue,
    displayProposedValueUrl: params.displayProposedValueUrl,
    reason: params.reason,
    issueRuleId: params.ruleId,
    isApplySupported: params.isApplySupported ?? false,
    actionType: params.actionType ?? "manual-only"
  };
}

function isValidationEnabled(
  settings: GoogleMapsValidationSettings | undefined,
  checkKey: GoogleMapsValidationCheckKey
): boolean {
  if (settings?.enabled === false) {
    return false;
  }

  return settings?.checks?.[checkKey] ?? true;
}

function buildValidationFinding(params: {
  providerId: string;
  field?: string;
  ruleIdSuffix: string;
  severity: IssueSeverity;
  message: string;
  currentValue?: unknown;
  proposedValue?: unknown;
  displayCurrentValue?: string;
  displayProposedValue?: string;
  displayProposedValueUrl?: string;
  reason: string;
  isApplySupported?: boolean;
  actionType?: "set-field" | "manual-only";
}): ExternalProviderValidationFinding {
  const ruleId = `${EXTERNAL_PROVIDER_VALIDATION_RULE_ID_PREFIX}${params.ruleIdSuffix}`;

  return {
    issue: {
      field: params.field ?? "externalProviderIds",
      severity: params.severity,
      message: params.message,
      groupKey: buildValidationGroupKey(params.providerId, ruleId),
      ruleId
    },
    proposal: buildExternalProviderValidationProposal({
      providerId: params.providerId,
      ruleId,
      field: params.field,
      currentValue: params.currentValue,
      proposedValue: params.proposedValue,
      displayCurrentValue: params.displayCurrentValue,
      displayProposedValue: params.displayProposedValue,
      displayProposedValueUrl: params.displayProposedValueUrl,
      reason: params.reason,
      isApplySupported: params.isApplySupported,
      actionType: params.actionType
    })
  };
}

export function isExternalProviderValidationRuleId(ruleId?: string): boolean {
  return (
    typeof ruleId === "string" &&
    ruleId.startsWith(EXTERNAL_PROVIDER_VALIDATION_RULE_ID_PREFIX)
  );
}

export function buildExternalProviderValidationFindings(
  snapshot: ExternalProviderValidationSnapshot,
  settings?: GoogleMapsValidationSettings,
  config?: GoogleMapsValidationConfig
): ExternalProviderValidationFinding[] {
  const providerId = trimString(snapshot.providerId);

  if (!providerId) {
    return [];
  }

  const venueName = trimString(snapshot.venueName) ?? "";
  const placeName = trimString(snapshot.placeName);
  const address = trimString(snapshot.address);
  const googleUrl =
    trimString(snapshot.url) ??
    (placeName
      ? buildGoogleMapsPlaceUrl({
          providerId,
          name: placeName,
          address,
          nameScore: 1
        })
      : undefined);
  const businessStatus = normalizeBusinessStatus(snapshot.businessStatus);
  const googleOpeningHoursValue =
    snapshot.googleOpeningHoursValue ??
    buildOpeningHoursValueFromNormalizedSlots(snapshot.googleOpeningHours);
  const googleOpeningHoursDisplay =
    isTwentyFourSevenNormalizedHours(snapshot.googleOpeningHours)
      ? t("common.twentyFourSeven")
      : snapshot.googleOpeningHoursDisplay;
  const severities = {
    ...getDefaultGoogleMapsValidationSeverities(),
    ...(config?.severity ?? {})
  };
  const findings: ExternalProviderValidationFinding[] = [];

  if (snapshot.notFound && isValidationEnabled(settings, "notFound")) {
    findings.push(
      buildValidationFinding({
        providerId,
        ruleIdSuffix: "notFound",
        severity: severities.notFound,
        message: t("issue.externalProvider.validation.notFound", {
          providerId
        }),
        displayProposedValue: t("proposal.externalProvider.validation.notFound"),
        reason: t("proposal.externalProvider.validation.reason.notFound")
      })
    );
  }

  if (
    (businessStatus === "CLOSED_PERMANENTLY" ||
      snapshot.businessStatus === "permanently_closed") &&
    isValidationEnabled(settings, "closed")
  ) {
    findings.push(
      buildValidationFinding({
        providerId,
        ruleIdSuffix: "closed",
        severity: severities.closed,
        message: t("issue.externalProvider.validation.closed", {
          placeName: placeName ?? providerId
        }),
        displayProposedValue: placeName,
        displayProposedValueUrl: googleUrl,
        reason: appendReasonDetail(
          t("proposal.externalProvider.validation.reason.closed"),
          address
        )
      })
    );
  }

  if (
    typeof snapshot.distanceMeters === "number" &&
    snapshot.distanceMeters >=
      EXTERNAL_PROVIDER_VALIDATION_LOCATION_DRIFT_THRESHOLD_METERS &&
    isValidationEnabled(settings, "locationDrift")
  ) {
    findings.push(
      buildValidationFinding({
        providerId,
        ruleIdSuffix: "locationDrift",
        severity: severities.locationDrift,
        message: t("issue.externalProvider.validation.locationDrift", {
          placeName: placeName ?? providerId,
          distanceMeters: snapshot.distanceMeters
        }),
        displayProposedValue: placeName
          ? t("proposal.externalProvider.displayWithDistance", {
              name: placeName,
              distanceMeters: snapshot.distanceMeters
            })
          : undefined,
        displayProposedValueUrl: googleUrl,
        reason: appendReasonDetail(
          t("proposal.externalProvider.validation.reason.locationDrift", {
            distanceMeters: snapshot.distanceMeters
          }),
          address
        )
      })
    );
  }

  if (
    venueName &&
    placeName &&
    scoreExternalProviderName(venueName, placeName) <
      EXTERNAL_PROVIDER_VALIDATION_NAME_MATCH_THRESHOLD &&
    isValidationEnabled(settings, "nameMismatch")
  ) {
    findings.push(
      buildValidationFinding({
        providerId,
        field: "name",
        ruleIdSuffix: "nameMismatch",
        severity: severities.nameMismatch,
        message: t("issue.externalProvider.validation.nameMismatch", {
          venueName,
          placeName
        }),
        currentValue: venueName,
        proposedValue: placeName,
        displayCurrentValue: venueName,
        displayProposedValue: placeName,
        displayProposedValueUrl: googleUrl,
        reason: appendReasonDetail(
          t("proposal.externalProvider.validation.reason.nameMismatch"),
          address
        ),
        isApplySupported: true,
        actionType: "set-field"
      })
    );
  }

  const googleTypes = normalizeGooglePlaceTypes(snapshot.googleTypes);
  const expectedGoogleTypes = resolveExpectedGooglePlaceTypes(
    snapshot.currentCategories ?? []
  );

  if (
    isValidationEnabled(settings, "category") &&
    googleTypes.length > 0 &&
    expectedGoogleTypes.length > 0 &&
    !googleTypes.some((type) => expectedGoogleTypes.includes(type))
  ) {
    findings.push(
      buildValidationFinding({
        providerId,
        field: "categories",
        ruleIdSuffix: "categoryMismatch",
        severity: severities.category,
        message: t("issue.externalProvider.validation.categoryMismatch", {
          placeName: placeName ?? providerId
        }),
        currentValue: snapshot.currentCategories ?? [],
        displayCurrentValue:
          (snapshot.currentCategories ?? []).length > 0
            ? snapshot.currentCategories.join(", ")
            : undefined,
        displayProposedValue: googleTypes.join(", "),
        displayProposedValueUrl: googleUrl,
        reason: t("proposal.externalProvider.validation.reason.categoryMismatch", {
          googleTypes: googleTypes.join(", "),
          expectedTypes: expectedGoogleTypes.join(", ")
        })
      })
    );
  }

  const normalizedCurrentOpeningHours = snapshot.currentOpeningHours
    ? normalizeCurrentOpeningHours(snapshot.currentOpeningHours)
    : [];

  if (
    isValidationEnabled(settings, "openingHours") &&
    normalizedCurrentOpeningHours !== null &&
    snapshot.googleOpeningHours &&
    !arraysEqual(normalizedCurrentOpeningHours, snapshot.googleOpeningHours)
  ) {
    findings.push(
      buildValidationFinding({
        providerId,
        field: "openingHours",
        ruleIdSuffix: "openingHoursDifferent",
        severity: severities.openingHours,
        message: t("issue.externalProvider.validation.openingHoursDifferent", {
          placeName: placeName ?? providerId
        }),
        currentValue: snapshot.currentOpeningHours ?? [],
        proposedValue: googleOpeningHoursValue ?? [],
        displayCurrentValue:
          formatWmeOpeningHoursDisplay(snapshot.currentOpeningHours ?? []) ??
          t("common.missing"),
        displayProposedValue: googleOpeningHoursDisplay,
        displayProposedValueUrl: googleUrl,
        reason: appendReasonDetail(
          t("proposal.externalProvider.validation.reason.openingHoursDifferent"),
          address
        ),
        isApplySupported: Array.isArray(googleOpeningHoursValue),
        actionType: Array.isArray(googleOpeningHoursValue)
          ? "set-field"
          : "manual-only"
      })
    );
  }

  return findings;
}
