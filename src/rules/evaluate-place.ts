import type { PlaceLike } from "../types/place";
import type { EffectivePlacePolicy } from "../types/policy";
import type { PlaceIssue } from "../types/issue";
import type { ChainRecord } from "../types/chains";
import type { AddressPolicy, PresenceRequirement } from "../types/address";
import type {
  RuleConfig,
  PhoneFormattingConfig,
  UrlFormattingConfig
} from "../types/config";
import { buildPhoneFormatIssue } from "./phone-format.ts";
import { buildUrlFormatIssue } from "./url-format.ts";

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

function normalizeEditorNotes(notes: string[] | undefined): string[] {
  if (!Array.isArray(notes)) {
    return [];
  }

  return Array.from(
    new Set(
      notes
        .map((note) => (typeof note === "string" ? normalizeWhitespace(note) : ""))
        .filter((note) => note.length > 0)
    )
  );
}

const ADDRESS_FIELD_METADATA: Array<{
  key: keyof AddressPolicy;
  label: string;
}> = [
  { key: "city", label: "city" },
  { key: "street", label: "street name" },
  { key: "houseNumber", label: "house number" }
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
  messages: Record<PresenceRequirement, string>;
}): PlaceIssue | undefined {
  const { field, rulePrefix, requirement, hasValue, currentValue, messages } =
    params;
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
  label: string;
  requirement: PresenceRequirement;
  currentValue: string | undefined;
}): void {
  const { issues, fieldKey, label, requirement, currentValue } = params;
  const issue = buildPresenceIssue({
    field: `address.${fieldKey}`,
    rulePrefix: `address.${fieldKey}`,
    requirement,
    hasValue: hasText(currentValue),
    currentValue,
    messages: {
      required: `Address must include ${label}`,
      recommended: `Address should include ${label}`,
      discouraged: `Address should not include ${label}`,
      forbidden: `Address must not include ${label}`
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
  const categoryEditorNotes = normalizeEditorNotes(policy.editorNotes);
  const chainEditorNotes = normalizeEditorNotes(chain?.editorNotes);
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
      message: `Name should be "${expectedName}"`,
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
        message: `Venue name should not include city name "${place.address.city}"`,
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
          message: `Geometry must be ${policy.geometry.required}`,
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

  if (policy.phone) {
    const issue = buildPresenceIssue({
      field: "phone",
      rulePrefix: "phoneValidation",
      requirement: policy.phone,
      hasValue: hasText(place.phone),
      currentValue: place.phone,
      messages: {
        required: "Phone number is required",
        recommended: "Phone number is recommended",
        discouraged: "Phone number should not be provided",
        forbidden: "Phone number must not be provided"
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
        required: "URL is required",
        recommended: "URL is recommended",
        discouraged: "URL should not be provided",
        forbidden: "URL must not be provided"
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
      message: `URL should be "${expectedUrl}"`,
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
        required: "Opening hours are required",
        recommended: "Opening hours are recommended",
        discouraged: "Opening hours should not be provided",
        forbidden: "Opening hours must not be provided"
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
        required: "Polygon venues must have at least one navigation point",
        recommended: "Polygon venues should have at least one navigation point",
        discouraged: "Polygon venues should not have navigation points",
        forbidden: "Polygon venues must not have navigation points"
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
        message: "Opening hours are missing but the chain provides a template",
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
          message: "Opening hours differ from the chain template",
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
      message: `Suggested alias missing: ${requiredAlias}`,
      groupKey: "aliases.suggested",
      groupMessage: "Suggested aliases missing",
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
      message: `Optional alias suggestion: ${optionalAlias}`,
      groupKey: "aliases.suggested",
      groupMessage: "Suggested aliases missing",
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
        required: "At least one external provider id is required",
        recommended: "At least one external provider id is recommended",
        discouraged: "External provider ids should not be provided",
        forbidden: "Venue must not have external provider ids"
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
      message: "External provider ids differ from the chain standard",
      currentValue: externalProviderIds,
      expectedValue: expectedExternalProviderIds,
      ruleId: "externalProvider.match"
    });
  }

  //
  // ADDRESS
  //

  if (policy.address) {
    for (const { key, label } of ADDRESS_FIELD_METADATA) {
      const requirement = policy.address[key];

      if (!requirement) {
        continue;
      }

      pushAddressIssue({
        issues,
        fieldKey: key,
        label,
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
            message: `Required service missing: ${required}`,
            groupKey: "services.required",
            groupMessage: "Required services missing",
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
            groupKey: "services.recommended",
            groupMessage: "Recommended services missing",
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
            message: `Discouraged service present: ${discouraged}`,
            groupKey: "services.discouraged",
            groupMessage: "Discouraged services present",
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
            message: `Forbidden service present: ${forbidden}`,
            groupKey: "services.forbidden",
            groupMessage: "Forbidden services present",
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
