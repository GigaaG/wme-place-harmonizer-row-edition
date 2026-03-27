import assert from "node:assert/strict";

import { buildExternalProviderValidationFindings } from "../src/integration/sdk/external-provider-validation.ts";

function getSingleFinding(ruleId: string, findings: ReturnType<typeof buildExternalProviderValidationFindings>) {
  const finding = findings.find((entry) => entry.issue.ruleId === ruleId);
  assert.ok(finding);
  return finding;
}

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest("flags linked provider ids that no longer resolve", () => {
  const finding = getSingleFinding(
    "externalProvider.validation.notFound",
    buildExternalProviderValidationFindings({
    providerId: "provider-missing",
    venueName: "Starbucks",
    notFound: true
    })
  );

  assert.equal(finding.issue.ruleId, "externalProvider.validation.notFound");
  assert.equal(finding.issue.severity, "warning");
  assert.equal(
    finding.issue.message,
    "Linked Google Place could not be found: provider-missing"
  );
  assert.equal(finding.proposal.isApplySupported, false);
  assert.equal(finding.proposal.actionType, "manual-only");
  assert.equal(
    finding.proposal.displayProposedValue,
    "Google Place not found"
  );
});

runTest("flags permanently closed linked providers", () => {
  const finding = getSingleFinding(
    "externalProvider.validation.closed",
    buildExternalProviderValidationFindings({
    providerId: "provider-closed",
    venueName: "Starbucks",
    placeName: "Starbucks Damrak",
    address: "Damrak 1, Amsterdam",
    businessStatus: "CLOSED_PERMANENTLY"
    })
  );

  assert.equal(finding.issue.ruleId, "externalProvider.validation.closed");
  assert.equal(finding.issue.severity, "warning");
  assert.equal(
    finding.issue.message,
    "Linked Google Place is permanently closed: Starbucks Damrak"
  );
  assert.equal(
    finding.proposal.displayProposedValueUrl,
    "https://www.google.com/maps/search/?api=1&query=Starbucks+Damrak+Damrak+1%2C+Amsterdam&query_place_id=provider-closed"
  );
  assert.match(
    finding.proposal.reason,
    /Google marks this place as permanently closed/
  );
});

runTest("flags linked providers when the Google name materially differs", () => {
  const finding = getSingleFinding(
    "externalProvider.validation.nameMismatch",
    buildExternalProviderValidationFindings({
    providerId: "provider-renamed",
    venueName: "Shell",
    placeName: "BP Damrak",
    address: "Damrak 5, Amsterdam"
    })
  );

  assert.equal(finding.issue.ruleId, "externalProvider.validation.nameMismatch");
  assert.equal(finding.issue.severity, "info");
  assert.equal(
    finding.issue.message,
    "Linked Google Place name differs: WME \"Shell\", Google \"BP Damrak\""
  );
  assert.equal(finding.proposal.displayCurrentValue, "Shell");
  assert.equal(finding.proposal.currentValue, "Shell");
});

runTest("flags linked providers with large location drift", () => {
  const finding = getSingleFinding(
    "externalProvider.validation.locationDrift",
    buildExternalProviderValidationFindings({
    providerId: "provider-drift",
    venueName: "Starbucks",
    placeName: "Starbucks Central",
    address: "Damrak 10, Amsterdam",
    distanceMeters: 387
    })
  );

  assert.equal(finding.issue.ruleId, "externalProvider.validation.locationDrift");
  assert.equal(finding.issue.severity, "warning");
  assert.equal(
    finding.issue.message,
    "Linked Google Place is 387 m from the venue geometry center: Starbucks Central"
  );
  assert.equal(
    finding.proposal.displayProposedValue,
    "Starbucks Central (387 m)"
  );
  assert.match(
    finding.proposal.reason,
    /Google Place is 387 m from the venue geometry center/
  );
});

runTest("flags linked providers when Google opening hours differ", () => {
  const finding = getSingleFinding(
    "externalProvider.validation.openingHoursDifferent",
    buildExternalProviderValidationFindings({
      providerId: "provider-hours",
      venueName: "Starbucks",
      placeName: "Starbucks Central",
      currentOpeningHours: [
        {
          days: [1, 2, 3, 4, 5],
          fromHour: "09:00",
          toHour: "18:00"
        }
      ],
      googleOpeningHours: [
        "1:08:00-18:00",
        "2:08:00-18:00",
        "3:08:00-18:00",
        "4:08:00-18:00",
        "5:08:00-18:00"
      ],
      googleOpeningHoursDisplay: "Mon-Fri: 8:00 AM-6:00 PM"
    })
  );

  assert.equal(
    finding.issue.message,
    "Linked Google Place opening hours differ from WME: Starbucks Central"
  );
  assert.equal(finding.issue.severity, "info");
  assert.equal(
    finding.proposal.displayCurrentValue,
    "1:09:00-18:00, 2:09:00-18:00, 3:09:00-18:00, 4:09:00-18:00, 5:09:00-18:00"
  );
  assert.equal(finding.proposal.displayProposedValue, "Mon-Fri: 8:00 AM-6:00 PM");
});

runTest("shows missing as the current value when WME opening hours are empty", () => {
  const finding = getSingleFinding(
    "externalProvider.validation.openingHoursDifferent",
    buildExternalProviderValidationFindings({
      providerId: "provider-hours-missing",
      venueName: "Starbucks",
      placeName: "Starbucks Central",
      currentOpeningHours: [],
      googleOpeningHours: [
        "0:08:00-23:00",
        "1:08:00-23:00",
        "2:08:00-23:00",
        "3:08:00-23:00",
        "4:08:00-23:00",
        "5:08:00-23:00",
        "6:08:00-23:00"
      ],
      googleOpeningHoursDisplay:
        "maandag: 08:00-23:00 | dinsdag: 08:00-23:00 | woensdag: 08:00-23:00 | donderdag: 08:00-23:00 | vrijdag: 08:00-23:00 | zaterdag: 08:00-23:00 | zondag: 08:00-23:00"
    })
  );

  assert.deepEqual(finding.proposal.currentValue, []);
  assert.equal(finding.proposal.displayCurrentValue, "missing");
});

runTest("flags linked providers when Google place types do not match mapped WME categories", () => {
  const finding = getSingleFinding(
    "externalProvider.validation.categoryMismatch",
    buildExternalProviderValidationFindings({
      providerId: "provider-category",
      venueName: "Shell",
      placeName: "Shell Damrak",
      currentCategories: ["GAS_STATION"],
      googleTypes: ["restaurant", "food", "point_of_interest"]
    })
  );

  assert.equal(
    finding.issue.message,
    "Linked Google Place categories do not match the WME category mapping: Shell Damrak"
  );
  assert.equal(finding.issue.severity, "info");
  assert.equal(finding.proposal.displayCurrentValue, "GAS_STATION");
  assert.match(finding.proposal.reason, /restaurant/);
  assert.match(finding.proposal.reason, /gas_station/);
});

runTest("does not flag categories when mapped Google place types overlap", () => {
  const findings = buildExternalProviderValidationFindings({
    providerId: "provider-category-ok",
    venueName: "Shell",
    placeName: "Shell Damrak",
    currentCategories: ["GAS_STATION"],
    googleTypes: ["gas_station", "point_of_interest"]
  });

  assert.equal(
    findings.some(
      (finding) =>
        finding.issue.ruleId === "externalProvider.validation.categoryMismatch"
    ),
    false
  );
});

runTest("ignores minor name formatting differences for linked providers", () => {
  const findings = buildExternalProviderValidationFindings({
    providerId: "provider-same",
    venueName: "McDonald's",
    placeName: "Mc Donalds"
  });

  assert.equal(findings.length, 0);
});

runTest("ignores linked providers with small location drift", () => {
  const findings = buildExternalProviderValidationFindings({
    providerId: "provider-near",
    venueName: "Starbucks",
    placeName: "Starbucks Central",
    distanceMeters: 120
  });

  assert.equal(findings.length, 0);
});

runTest("honors per-check Google validation settings", () => {
  const findings = buildExternalProviderValidationFindings(
    {
      providerId: "provider-closed",
      venueName: "Shell",
      placeName: "BP Damrak",
      businessStatus: "CLOSED_PERMANENTLY",
      distanceMeters: 600
    },
    {
      enabled: true,
      checks: {
        notFound: true,
        closed: false,
        locationDrift: true,
        nameMismatch: false,
        category: false,
        openingHours: false
      }
    }
  );

  assert.equal(findings.length, 1);
  assert.equal(
    findings[0].issue.ruleId,
    "externalProvider.validation.locationDrift"
  );
});
