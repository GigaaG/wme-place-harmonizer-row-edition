import type { HarmonizerConfig } from "../types/config.ts";
import type {
  GoogleMapsValidationChecks,
  GoogleMapsValidationSettings
} from "../types/settings.ts";
import { GOOGLE_MAPS_VALIDATION_CHECK_KEYS } from "../types/settings.ts";

export interface GoogleMapsValidationAvailability {
  enabled: boolean;
  checks: GoogleMapsValidationChecks;
}

export function getDefaultGoogleMapsValidationAvailability():
  GoogleMapsValidationAvailability {
  return {
    enabled: true,
    checks: Object.fromEntries(
      GOOGLE_MAPS_VALIDATION_CHECK_KEYS.map((checkKey) => [checkKey, true])
    ) as GoogleMapsValidationChecks
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
