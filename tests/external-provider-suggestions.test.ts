import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildGoogleMapsPlaceUrl,
  buildSuggestedExternalProviderIssueMessage,
  buildExternalProviderSuggestionProposals,
  CATEGORY_GOOGLE_PLACE_TYPE_MAP,
  rankExternalProviderSuggestions,
  resolveNearbySearchTypes,
  scoreExternalProviderName
} from "../src/integration/sdk/external-provider-suggestions.ts";
import type { PlaceIssue } from "../src/types/issue.ts";

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest("normalizes punctuation and spacing when scoring provider names", () => {
  assert.equal(scoreExternalProviderName("McDonald's", "Mc Donalds"), 1);
  assert.ok(scoreExternalProviderName("Starbucks", "Starbucks Coffee") > 0.8);
  assert.equal(scoreExternalProviderName("Shell", "BP"), 0);
});

runTest("maps WME categories to Google nearbySearch types", () => {
  assert.deepEqual(
    resolveNearbySearchTypes({
      categories: ["SUPERMARKET_GROCERY", "RESTAURANT", "SUPERMARKET_GROCERY"]
    }),
    ["supermarket", "restaurant"]
  );
});

runTest("expands categories to multiple official Google nearbySearch types when needed", () => {
  assert.deepEqual(resolveNearbySearchTypes({ categories: ["RELIGIOUS_CENTER"] }), [
    "church",
    "mosque",
    "synagogue",
    "hindu_temple"
  ]);
});

runTest("covers every official WME venue category in the Google nearbySearch map", () => {
  const sdkValues = JSON.parse(
    readFileSync(
      new URL("../../wme-place-harmonizer-row-data/reference/sdk-values.json", import.meta.url),
      "utf8"
    )
  ) as { categoryIds: string[] };
  const missingCategories = sdkValues.categoryIds.filter(
    (categoryId) => !(categoryId in CATEGORY_GOOGLE_PLACE_TYPE_MAP)
  );

  assert.deepEqual(missingCategories, []);
});

runTest("ranks closer and stronger nearby provider matches first", () => {
  const suggestions = rankExternalProviderSuggestions(
    "Starbucks",
    { lon: 4.9, lat: 52.37 },
    [
      {
        providerId: "partial-near",
        name: "Starbucks Coffee",
        address: "Damrak 1",
        location: { lon: 4.9002, lat: 52.3701 }
      },
      {
        providerId: "exact-farther",
        name: "Starbucks",
        address: "Rokin 5",
        location: { lon: 4.9025, lat: 52.37 }
      },
      {
        providerId: "other-brand",
        name: "Costa Coffee",
        address: "Damrak 9",
        location: { lon: 4.9001, lat: 52.3701 }
      }
    ]
  );

  assert.deepEqual(
    suggestions.map((suggestion) => suggestion.providerId),
    ["exact-farther", "partial-near"]
  );
  assert.equal(suggestions.length, 2);
});

runTest("keeps editor suggestion order as tie-breaker after name scoring", () => {
  const suggestions = rankExternalProviderSuggestions(
    "Albert Heijn",
    { lon: 4.9, lat: 52.37 },
    [
      {
        providerId: "editor-1",
        name: "Albert Heijn",
        address: "Damrak 1",
        sortIndex: 1
      },
      {
        providerId: "editor-0",
        name: "Albert Heijn",
        address: "Damrak 2",
        sortIndex: 0
      }
    ]
  );

  assert.deepEqual(
    suggestions.map((suggestion) => suggestion.providerId),
    ["editor-0", "editor-1"]
  );
});

runTest("keeps only the top five ranked nearby provider suggestions", () => {
  const suggestions = rankExternalProviderSuggestions(
    "Albert Heijn",
    { lon: 4.9, lat: 52.37 },
    [
      {
        providerId: "provider-6",
        name: "Albert Heijn",
        address: "Address 6",
        location: { lon: 4.9007, lat: 52.37 }
      },
      {
        providerId: "provider-5",
        name: "Albert Heijn",
        address: "Address 5",
        location: { lon: 4.9006, lat: 52.37 }
      },
      {
        providerId: "provider-4",
        name: "Albert Heijn",
        address: "Address 4",
        location: { lon: 4.9005, lat: 52.37 }
      },
      {
        providerId: "provider-3",
        name: "Albert Heijn",
        address: "Address 3",
        location: { lon: 4.9004, lat: 52.37 }
      },
      {
        providerId: "provider-2",
        name: "Albert Heijn",
        address: "Address 2",
        location: { lon: 4.9003, lat: 52.37 }
      },
      {
        providerId: "provider-1",
        name: "Albert Heijn",
        address: "Address 1",
        location: { lon: 4.9002, lat: 52.37 }
      }
    ]
  );

  assert.equal(suggestions.length, 5);
  assert.deepEqual(
    suggestions.map((suggestion) => suggestion.providerId),
    ["provider-1", "provider-2", "provider-3", "provider-4", "provider-5"]
  );
});

runTest("builds applyable proposals for nearby external provider suggestions", () => {
  const issue: PlaceIssue = {
    field: "externalProviderIds",
    severity: "warning",
    message: "At least one external provider id is recommended",
    ruleId: "externalProvider.recommended"
  };
  const proposals = buildExternalProviderSuggestionProposals(issue, [
    {
      providerId: "provider-123",
      name: "Starbucks",
      address: "Damrak 1",
      distanceMeters: 42,
      nameScore: 1
    }
  ], ["provider-001"]);

  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].field, "externalProviderIds");
  assert.equal(proposals[0].issueRuleId, "externalProvider.recommended");
  assert.equal(proposals[0].isApplySupported, true);
  assert.equal(proposals[0].actionType, "set-field");
  assert.deepEqual(proposals[0].currentValue, ["provider-001"]);
  assert.deepEqual(proposals[0].proposedValue, ["provider-001", "provider-123"]);
  assert.equal(proposals[0].displayCurrentValue, "provider-001");
  assert.equal(proposals[0].displayProposedValue, "Starbucks (42 m)");
  assert.equal(
    proposals[0].displayProposedValueUrl,
    "https://www.google.com/maps/search/?api=1&query=Starbucks+Damrak+1&query_place_id=provider-123"
  );
  assert.equal(proposals[0].externalProviderSearchText, "Starbucks, Damrak 1");
  assert.equal(proposals[0].externalProviderTargetId, "provider-123");
  assert.equal(proposals[0].externalProviderTargetName, "Starbucks");
  assert.equal(proposals[0].externalProviderTargetAddress, "Damrak 1");
  assert.match(proposals[0].reason, /Damrak 1/);
  assert.ok(proposals[0].id?.includes("provider-123"));
});

runTest("builds a Google Maps link for the suggested place", () => {
  assert.equal(
    buildGoogleMapsPlaceUrl({
      providerId: "provider-123",
      name: "Albert Heijn",
      address: "Damrak 1",
      nameScore: 1
    }),
    "https://www.google.com/maps/search/?api=1&query=Albert+Heijn+Damrak+1&query_place_id=provider-123"
  );
});

runTest("adds the top suggestion to the issue message", () => {
  const issue: PlaceIssue = {
    field: "externalProviderIds",
    severity: "warning",
    message: "At least one external provider id is required",
    ruleId: "externalProvider.required"
  };

  assert.equal(
    buildSuggestedExternalProviderIssueMessage(issue, {
      providerId: "editor-0",
      name: "Albert Heijn",
      address: "Damrak 1",
      nameScore: 1
    }),
    "At least one external provider id is required. Suggested nearby match: Albert Heijn | Damrak 1"
  );
});
