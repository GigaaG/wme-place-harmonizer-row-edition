import assert from "node:assert/strict";

import { validateConfigFile } from "../src/config/config-loader.ts";
import {
  getEffectiveGoogleMapsValidationSettings,
  resolveGoogleMapsValidationAvailability,
  resolveGoogleMapsValidationSeverities
} from "../src/settings/google-maps-validation-policy.ts";
import type { GoogleMapsValidationSettings } from "../src/types/settings.ts";

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function buildUserSettings(): GoogleMapsValidationSettings {
  return {
    enabled: true,
    checks: {
      notFound: true,
      closed: true,
      locationDrift: true,
      nameMismatch: true,
      category: true,
      openingHours: true
    }
  };
}

runTest("config can disable individual Google validation checks", () => {
  const availability = resolveGoogleMapsValidationAvailability({
    id: "nl",
    type: "country-config",
    version: 1,
    googleMapsValidation: {
      checks: {
        openingHours: false,
        category: false
      }
    }
  });
  const effective = getEffectiveGoogleMapsValidationSettings({
    user: buildUserSettings(),
    availability
  });

  assert.equal(availability.enabled, true);
  assert.equal(availability.checks.openingHours, false);
  assert.equal(availability.checks.category, false);
  assert.equal(effective.enabled, true);
  assert.equal(effective.checks.openingHours, false);
  assert.equal(effective.checks.category, false);
  assert.equal(effective.checks.closed, true);
});

runTest("config can disable Google validation entirely", () => {
  const availability = resolveGoogleMapsValidationAvailability({
    id: "be-community",
    type: "community-config",
    version: 1,
    googleMapsValidation: {
      enabled: false
    }
  });
  const effective = getEffectiveGoogleMapsValidationSettings({
    user: buildUserSettings(),
    availability
  });

  assert.equal(availability.enabled, false);
  assert.equal(effective.enabled, false);

  for (const isEnabled of Object.values(effective.checks)) {
    assert.equal(isEnabled, false);
  }
});

runTest("config can override Google validation severities", () => {
  const severities = resolveGoogleMapsValidationSeverities({
    id: "nl",
    type: "country-config",
    version: 1,
    googleMapsValidation: {
      severity: {
        nameMismatch: "warning",
        openingHours: "error"
      }
    }
  });

  assert.equal(severities.notFound, "warning");
  assert.equal(severities.nameMismatch, "warning");
  assert.equal(severities.openingHours, "error");
});

runTest("config can define ordered Google validation name locales", () => {
  const config = validateConfigFile(
    {
      id: "be",
      type: "country-config",
      version: 1,
      googleMapsValidation: {
        nameLocales: ["nl", "fr", "de"]
      }
    },
    "config/countries/be.json"
  );

  assert.deepEqual(config.googleMapsValidation?.nameLocales, [
    "nl",
    "fr",
    "de"
  ]);
});

runTest("config loader rejects invalid Google validation config", () => {
  assert.throws(
    () =>
      validateConfigFile(
        {
          id: "nl",
          type: "country-config",
          version: 1,
          googleMapsValidation: {
            checks: {
              openingHours: "no"
            }
          }
        },
        "config/countries/nl.json"
      ),
    /Config googleMapsValidation\.checks\.openingHours must be a boolean/
  );
});

runTest("config loader rejects invalid Google validation name locales", () => {
  assert.throws(
    () =>
      validateConfigFile(
        {
          id: "be",
          type: "country-config",
          version: 1,
          googleMapsValidation: {
            nameLocales: ["nl", ""]
          }
        },
        "config/countries/be.json"
      ),
    /Config googleMapsValidation\.nameLocales\[1\] must be a non-empty string/
  );
});

runTest("config loader rejects invalid Google validation severity values", () => {
  assert.throws(
    () =>
      validateConfigFile(
        {
          id: "nl",
          type: "country-config",
          version: 1,
          googleMapsValidation: {
            severity: {
              openingHours: "urgent"
            }
          }
        },
        "config/countries/nl.json"
      ),
    /Config googleMapsValidation\.severity\.openingHours must be a valid severity/
  );
});
