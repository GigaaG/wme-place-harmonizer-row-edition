import type { HarmonizerConfig } from "../types/config.ts";
import type { IssueSeverity } from "../types/issue.ts";
import type {
  GoogleMapsValidationCheckKey,
  GoogleMapsValidationChecks,
  GoogleMapsValidationSettings
} from "../types/settings.ts";
import { GOOGLE_MAPS_VALIDATION_CHECK_KEYS } from "../types/settings.ts";

export interface GoogleMapsValidationAvailability {
  enabled: boolean;
  checks: GoogleMapsValidationChecks;
}

export interface GoogleMapsValidationSeverities {
  notFound: IssueSeverity;
  closed: IssueSeverity;
  locationDrift: IssueSeverity;
  nameMismatch: IssueSeverity;
  category: IssueSeverity;
  openingHours: IssueSeverity;
}

const DEFAULT_GOOGLE_MAPS_VALIDATION_SEVERITIES: GoogleMapsValidationSeverities = {
  notFound: "warning",
  closed: "warning",
  locationDrift: "warning",
  nameMismatch: "info",
  category: "info",
  openingHours: "info"
};

export function getDefaultGoogleMapsValidationAvailability():
  GoogleMapsValidationAvailability {
  return {
    enabled: true,
    checks: Object.fromEntries(
      GOOGLE_MAPS_VALIDATION_CHECK_KEYS.map((checkKey) => [checkKey, true])
    ) as GoogleMapsValidationChecks
  };
}

export function getDefaultGoogleMapsValidationSeverities():
  GoogleMapsValidationSeverities {
  return {
    ...DEFAULT_GOOGLE_MAPS_VALIDATION_SEVERITIES
  };
}

export function resolveGoogleMapsValidationAvailability(
  config?: HarmonizerConfig | null
): GoogleMapsValidationAvailability {
  const enabled = config?.googleMapsValidation?.enabled !== false;

  return {
    enabled,
    checks: Object.fromEntries(
      GOOGLE_MAPS_VALIDATION_CHECK_KEYS.map((checkKey) => [
        checkKey,
        enabled && config?.googleMapsValidation?.checks?.[checkKey] !== false
      ])
    ) as GoogleMapsValidationChecks
  };
}

export function resolveGoogleMapsValidationSeverities(
  config?: HarmonizerConfig | null
): GoogleMapsValidationSeverities {
  return Object.fromEntries(
    GOOGLE_MAPS_VALIDATION_CHECK_KEYS.map((checkKey) => [
      checkKey,
      config?.googleMapsValidation?.severity?.[checkKey] ??
        DEFAULT_GOOGLE_MAPS_VALIDATION_SEVERITIES[checkKey]
    ])
  ) as GoogleMapsValidationSeverities;
}

export function getGoogleMapsValidationSeverity(params: {
  checkKey: GoogleMapsValidationCheckKey;
  config?: HarmonizerConfig | null;
}): IssueSeverity {
  return resolveGoogleMapsValidationSeverities(params.config)[params.checkKey];
}

export function getEffectiveGoogleMapsValidationSettings(params: {
  user: GoogleMapsValidationSettings;
  availability: GoogleMapsValidationAvailability;
}): GoogleMapsValidationSettings {
  return {
    enabled: params.availability.enabled && params.user.enabled,
    checks: Object.fromEntries(
      GOOGLE_MAPS_VALIDATION_CHECK_KEYS.map((checkKey) => [
        checkKey,
        params.availability.checks[checkKey] && params.user.checks[checkKey]
      ])
    ) as GoogleMapsValidationChecks
  };
}
