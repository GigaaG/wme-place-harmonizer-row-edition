import type { PlaceLike } from "../types/place";
import type { EffectivePlacePolicy } from "../types/policy";
import type { PlaceIssue } from "../types/issue";
import type { ChainRecord } from "../types/chains";
import type { AddressPolicy, PresenceRequirement } from "../types/address";
import type {
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
    phoneFormatting?: PhoneFormattingConfig;
    urlFormatting?: UrlFormattingConfig;
  }
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

    if (policy.services.discouraged) {
      for (const discouraged of policy.services.discouraged) {
        if (services.includes(discouraged)) {
          issues.push({
            field: "services",
            severity: "warning",
            message: `Discouraged service present: ${discouraged}`,
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
