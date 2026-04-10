import type { PlaceLike } from "../types/place";
import type { EffectivePlacePolicy } from "../types/policy";
import type { PlaceIssue } from "../types/issue";
import type { ChainRecord } from "../types/chains";
import type {
  AddressPolicy,
  EnforcedPresenceRequirement,
  PresenceRequirement
} from "../types/address";
import type {
  RuleConfig,
  PhoneFormattingConfig,
  UrlFormattingConfig
} from "../types/config";
import { buildPhoneFormatIssue } from "./phone-format.ts";
import { buildUrlFormatIssue } from "./url-format.ts";
import { getRuntimeLocaleCode, t } from "../i18n/runtime.ts";
import { resolveLocalizedTextList } from "../i18n/locale-utils.ts";

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

function normalizeAliases(aliases: string[] | undefined): string[] {
  if (!Array.isArray(aliases)) {
    return [];
  }

  return Array.from(
    new Set(
      aliases
        .map((alias) => normalizeWhitespace(String(alias)))
        .filter((alias) => alias.length > 0)
    )
  );
}

const ADDRESS_FIELD_METADATA: Array<{
  key: keyof AddressPolicy;
  labelKey: string;
}> = [
  { key: "city", labelKey: "field.address.city" },
  { key: "street", labelKey: "field.address.street" },
  { key: "houseNumber", labelKey: "field.address.houseNumber" }
];

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function containsWholeCityName(name: string, city: string): boolean {
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(city)}([^\\p{L}\\p{N}]|$)`, "iu");
  return pattern.test(name);
}

function stripCityFromVenueName(name: string, city: string): string | undefined {
  const trimmedName = normalizeWhitespace(name);
  const trimmedCity = normalizeWhitespace(city);

  if (!trimmedName || !trimmedCity || !containsWholeCityName(trimmedName, trimmedCity)) {
    return undefined;
  }

  const removalPatterns = [
    new RegExp(`\\s*\\(${escapeRegExp(trimmedCity)}\\)\\s*$`, "iu"),
    new RegExp(`\\s*[,\\-|/|]\\s*${escapeRegExp(trimmedCity)}\\s*$`, "iu"),
    new RegExp(`^${escapeRegExp(trimmedCity)}\\s*[-,:/|]\\s*`, "iu"),
    new RegExp(`\\s+${escapeRegExp(trimmedCity)}\\s*$`, "iu"),
    new RegExp(`^${escapeRegExp(trimmedCity)}\\s+`, "iu")
  ];

  for (const pattern of removalPatterns) {
    const updated = normalizeWhitespace(trimmedName.replace(pattern, " "));

    if (updated && updated !== trimmedName) {
      return updated;
    }
  }

  return undefined;
}

function buildPresenceIssue(params: {
  field: string;
  rulePrefix: string;
  requirement: PresenceRequirement;
  hasValue: boolean;
  currentValue?: unknown;
  messages: Record<EnforcedPresenceRequirement, string>;
}): PlaceIssue | undefined {
  const { field, rulePrefix, requirement, hasValue, currentValue, messages } =
    params;

  if (requirement === "optional") {
    return undefined;
  }

  const ruleId = `${rulePrefix}.${requirement}`;

  if (requirement === "required" && !hasValue) {
    return {
      field,
      severity: "error",
      message: messages.required,
      expectedValue: "present",
      ruleId
    };
  }

  if (requirement === "recommended" && !hasValue) {
    return {
      field,
      severity: "warning",
      message: messages.recommended,
      expectedValue: "present",
      ruleId
    };
  }

  if (requirement === "discouraged" && hasValue) {
    return {
      field,
      severity: "warning",
      message: messages.discouraged,
      currentValue,
      expectedValue: "absent",
      ruleId
    };
  }

  if (requirement === "forbidden" && hasValue) {
    return {
      field,
      severity: "error",
      message: messages.forbidden,
      currentValue,
      expectedValue: "absent",
      ruleId
    };
  }
}

function pushAddressIssue(params: {
  issues: PlaceIssue[];
  fieldKey: keyof AddressPolicy;
  labelKey: string;
  requirement: PresenceRequirement;
  currentValue: string | undefined;
}): void {
  const { issues, fieldKey, labelKey, requirement, currentValue } = params;
  const label = t(labelKey);
  const issue = buildPresenceIssue({
    field: `address.${fieldKey}`,
    rulePrefix: `address.${fieldKey}`,
    requirement,
    hasValue: hasText(currentValue),
    currentValue,
    messages: {
      required: t("issue.address.required", { field: label }),
      recommended: t("issue.address.recommended", { field: label }),
      discouraged: t("issue.address.discouraged", { field: label }),
      forbidden: t("issue.address.forbidden", { field: label })
    }
  });

  if (issue) {
    issues.push(issue);
  }
}

export function evaluatePlace(
  place: PlaceLike,
  policy: EffectivePlacePolicy,
  chain?: ChainRecord,
  options?: {
    cityInVenueNameRule?: RuleConfig;
    phoneFormatting?: PhoneFormattingConfig;
    urlFormatting?: UrlFormattingConfig;
  }
): PlaceIssue[] {
  const issues: PlaceIssue[] = [];
  const aliases = normalizeAliases(place.aliases);
  const runtimeLocaleCode = getRuntimeLocaleCode();
  const categoryEditorNotes = resolveLocalizedTextList(
    policy.editorNotes,
    runtimeLocaleCode
  );
  const chainEditorNotes = resolveLocalizedTextList(
    chain?.editorNotes,
    runtimeLocaleCode
  );
  const externalProviderIds = normalizeExternalProviderIds(
    place.externalProviderIds
  );
  const hasExternalProviders = externalProviderIds.length > 0;
  const cityInVenueNameRule = options?.cityInVenueNameRule;
  const isCityInVenueNameEnabled =
    policy.cityInVenueName ?? cityInVenueNameRule?.enabled ?? false;
  const cityInVenueNameSeverity = cityInVenueNameRule?.severity ?? "warning";
  const seenEditorNotes = new Set<string>();

  const pushEditorNote = (message: string, ruleId: string): void => {
    if (seenEditorNotes.has(message)) {
      return;
    }

    seenEditorNotes.add(message);
    issues.push({
      field: "",
      severity: "info",
      message,
      ruleId
    });
  };

  //
  // NAME
  //

  const expectedName = chain?.standard?.name;
  if (expectedName && place.name.trim() !== expectedName.trim()) {
    issues.push({
      field: "name",
      severity: "warning",
      message: t("issue.name.shouldBe", { expectedName }),
      currentValue: place.name,
      expectedValue: expectedName,
      ruleId: "nameNormalization"
    });
  }

  if (
    !expectedName &&
    isCityInVenueNameEnabled &&
    hasText(place.address?.city)
  ) {
    const suggestedName = stripCityFromVenueName(place.name, place.address.city);

    if (suggestedName) {
      issues.push({
        field: "name",
        severity: cityInVenueNameSeverity,
        message: t("issue.name.cityShouldBeExcluded", {
          cityName: place.address.city
        }),
        currentValue: place.name,
        expectedValue: suggestedName,
        ruleId: "cityInVenueName"
      });
    }
  }

  //
  // GEOMETRY
  //

  if (policy.geometry && place.geometry) {
    if (policy.geometry.required) {
      if (place.geometry !== policy.geometry.required) {
        issues.push({
          field: "geometry",
          severity: "error",
          message: t("issue.geometry.required", {
            geometry: policy.geometry.required
          }),
          currentValue: place.geometry,
          expectedValue: policy.geometry.required,
          ruleId: "geometry.required"
        });
      }
    } else if (
      policy.geometry.recommended &&
      place.geometry !== policy.geometry.recommended
    ) {
      issues.push({
        field: "geometry",
        severity: "warning",
        message: t("issue.geometry.recommended", {
          geometry: policy.geometry.recommended
        }),
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
      message: t("issue.lockLevel.minimum", {
        lockLevel: policy.lockLevel
      }),
      currentValue: place.lockLevel,
      expectedValue: policy.lockLevel,
      ruleId: "lockLevelRecommendation"
    });
  }

  //
  // PHONE
  //

  if (policy.phone) {
    const issue = buildPresenceIssue({
      field: "phone",
      rulePrefix: "phoneValidation",
      requirement: policy.phone,
      hasValue: hasText(place.phone),
      currentValue: place.phone,
      messages: {
        required: t("issue.phone.required"),
        recommended: t("issue.phone.recommended"),
        discouraged: t("issue.phone.discouraged"),
        forbidden: t("issue.phone.forbidden")
      }
    });

    if (issue) {
      issues.push(issue);
    }
  }

  if (hasText(place.phone)) {
    const issue = buildPhoneFormatIssue(place.phone, options?.phoneFormatting);

    if (issue) {
      issues.push(issue);
    }
  }

  //
  // URL
  //

  if (policy.url) {
    const issue = buildPresenceIssue({
      field: "url",
      rulePrefix: "urlValidation",
      requirement: policy.url,
      hasValue: hasText(place.url),
      currentValue: place.url,
      messages: {
        required: t("issue.url.required"),
        recommended: t("issue.url.recommended"),
        discouraged: t("issue.url.discouraged"),
        forbidden: t("issue.url.forbidden")
      }
    });

    if (issue) {
      issues.push(issue);
    }
  }

  if (hasText(place.url)) {
    const issue = buildUrlFormatIssue(place.url, options?.urlFormatting);

    if (issue) {
      issues.push(issue);
    }
  }

  const expectedUrl = chain?.standard?.url;
  if (expectedUrl && (place.url ?? "").trim() !== expectedUrl.trim()) {
    issues.push({
      field: "url",
      severity: "warning",
      message: t("issue.url.shouldBe", { expectedUrl }),
      currentValue: place.url,
      expectedValue: expectedUrl,
      ruleId: "urlNormalization"
    });
  }

  //
  // OPENING HOURS
  //

  if (policy.openingHours) {
    const issue = buildPresenceIssue({
      field: "openingHours",
      rulePrefix: "openingHours",
      requirement: policy.openingHours,
      hasValue: Boolean(place.openingHours && place.openingHours.length > 0),
      currentValue: place.openingHours,
      messages: {
        required: t("issue.openingHours.required"),
        recommended: t("issue.openingHours.recommended"),
        discouraged: t("issue.openingHours.discouraged"),
        forbidden: t("issue.openingHours.forbidden")
      }
    });

    if (issue) {
      issues.push(issue);
    }
  }

  //
  // NAVIGATION POINTS
  //

  if (policy.navigationPoints && place.geometry === "polygon") {
    const navigationPointCount =
      typeof place.navigationPointCount === "number" && place.navigationPointCount > 0
        ? place.navigationPointCount
        : 0;

    const issue = buildPresenceIssue({
      field: "navigationPoints",
      rulePrefix: "navigationPoints",
      requirement: policy.navigationPoints,
      hasValue: navigationPointCount > 0,
      currentValue: navigationPointCount,
      messages: {
        required: t("issue.navigationPoints.required"),
        recommended: t("issue.navigationPoints.recommended"),
        discouraged: t("issue.navigationPoints.discouraged"),
        forbidden: t("issue.navigationPoints.forbidden")
      }
    });

    if (issue) {
      issues.push(issue);
    }
  }

  const expectedOpeningHours = chain?.standard?.openingHoursTemplate;
  if (expectedOpeningHours && expectedOpeningHours.length > 0) {
    const normalizeHours = (hours: typeof expectedOpeningHours) =>
      hours.map((entry) => JSON.stringify(entry)).sort();

    const currentOpeningHours = place.openingHours ?? [];

    if (currentOpeningHours.length === 0) {
      issues.push({
        field: "openingHours",
        severity: "warning",
        message: t("issue.openingHours.templateMissing"),
        currentValue: currentOpeningHours,
        expectedValue: expectedOpeningHours,
        ruleId: "openingHours.template"
      });
    } else {
      const current = normalizeHours(currentOpeningHours);
      const expected = normalizeHours(expectedOpeningHours);

      if (!arraysEqual(current, expected)) {
        issues.push({
          field: "openingHours",
          severity: "warning",
          message: t("issue.openingHours.templateDifferent"),
          currentValue: currentOpeningHours,
          expectedValue: expectedOpeningHours,
          ruleId: "openingHours.template"
        });
      }
    }
  }

  //
  // ALIASES
  //

  const requiredAliases = normalizeAliases(chain?.standard?.aliases);
  const optionalAliases = normalizeAliases(chain?.standard?.optionalAliases);
  const normalizedCurrentAliases = new Set(
    aliases.map((alias) => alias.toLocaleLowerCase())
  );

  for (const requiredAlias of requiredAliases) {
    if (normalizedCurrentAliases.has(requiredAlias.toLocaleLowerCase())) {
      continue;
    }

    issues.push({
      field: "aliases",
      severity: "warning",
      message: t("issue.alias.requiredMissing", { alias: requiredAlias }),
      groupKey: "aliases.suggested",
      groupMessage: t("issue.alias.groupMissing"),
      currentValue: aliases,
      expectedValue: requiredAlias,
      ruleId: `aliases.suggested.${requiredAlias}`
    });
  }

  for (const optionalAlias of optionalAliases) {
    if (normalizedCurrentAliases.has(optionalAlias.toLocaleLowerCase())) {
      continue;
    }

    issues.push({
      field: "aliases",
      severity: "info",
      message: t("issue.alias.optionalSuggestion", { alias: optionalAlias }),
      groupKey: "aliases.suggested",
      groupMessage: t("issue.alias.groupMissing"),
      currentValue: aliases,
      expectedValue: optionalAlias,
      ruleId: `aliases.optional.${optionalAlias}`
    });
  }

  //
  // EXTERNAL PROVIDER IDS
  //

  if (policy.externalProviderIds) {
    const issue = buildPresenceIssue({
      field: "externalProviderIds",
      rulePrefix: "externalProvider",
      requirement: policy.externalProviderIds,
      hasValue: hasExternalProviders,
      currentValue: externalProviderIds,
      messages: {
        required: t("issue.externalProvider.required"),
        recommended: t("issue.externalProvider.recommended"),
        discouraged: t("issue.externalProvider.discouraged"),
        forbidden: t("issue.externalProvider.forbidden")
      }
    });

    if (issue) {
      issues.push(issue);
    }
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
      message: t("issue.externalProvider.chainMismatch"),
      currentValue: externalProviderIds,
      expectedValue: expectedExternalProviderIds,
      ruleId: "externalProvider.match"
    });
  }

  //
  // ADDRESS
  //

  if (policy.address) {
    for (const { key, labelKey } of ADDRESS_FIELD_METADATA) {
      const requirement = policy.address[key];

      if (!requirement) {
        continue;
      }

      pushAddressIssue({
        issues,
        fieldKey: key,
        labelKey,
        requirement,
        currentValue: place.address?.[key]
      });
    }
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
            message: t("issue.service.requiredMissing", { service: required }),
            groupKey: "services.required",
            groupMessage: t("issue.service.groupRequiredMissing"),
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
            message: t("issue.service.recommendedMissing", {
              service: recommended
            }),
            groupKey: "services.recommended",
            groupMessage: t("issue.service.groupRecommendedMissing"),
            currentValue: services,
            expectedValue: recommended,
            ruleId: `services.recommended.${recommended}`
          });
        }
      }
    }

    if (policy.services.discouraged) {
      for (const discouraged of policy.services.discouraged) {
        if (services.includes(discouraged)) {
          issues.push({
            field: "services",
            severity: "warning",
            message: t("issue.service.discouragedPresent", {
              service: discouraged
            }),
            groupKey: "services.discouraged",
            groupMessage: t("issue.service.groupDiscouragedPresent"),
            currentValue: services,
            expectedValue: discouraged,
            ruleId: `services.discouraged.${discouraged}`
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
            message: t("issue.service.forbiddenPresent", {
              service: forbidden
            }),
            groupKey: "services.forbidden",
            groupMessage: t("issue.service.groupForbiddenPresent"),
            currentValue: services,
            expectedValue: forbidden,
            ruleId: `services.forbidden.${forbidden}`
          });
        }
      }
    }
  }

  for (let index = 0; index < categoryEditorNotes.length; index += 1) {
    pushEditorNote(categoryEditorNotes[index], `editorNote.category.${index + 1}`);
  }

  for (let index = 0; index < chainEditorNotes.length; index += 1) {
    pushEditorNote(chainEditorNotes[index], `editorNote.chain.${index + 1}`);
  }

  return issues;
}
