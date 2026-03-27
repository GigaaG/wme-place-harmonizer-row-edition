import assert from "node:assert/strict";

import { validateConfigFile } from "../src/config/config-loader.ts";
import {
  getEffectiveGoogleMapsValidationSettings,
  resolveGoogleMapsValidationAvailability
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
