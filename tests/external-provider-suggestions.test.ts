import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildGoogleMapsPlaceUrl,
  buildSuggestedExternalProviderIssueMessage,
  buildExternalProviderSuggestionProposals,
  CATEGORY_GOOGLE_PLACE_TYPE_MAP,
  CATEGORY_GOOGLE_VALIDATION_TYPE_MAP,
  rankMovedExternalProviderSuggestions,
  rankNearbyDistanceFallbackSuggestions,
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

runTest("covers every official WME venue category in the Google validation map", () => {
  const sdkValues = JSON.parse(
    readFileSync(
      new URL("../../wme-place-harmonizer-row-data/reference/sdk-values.json", import.meta.url),
      "utf8"
    )
  ) as { categoryIds: string[] };
  const missingCategories = sdkValues.categoryIds.filter(
    (categoryId) => !(categoryId in CATEGORY_GOOGLE_VALIDATION_TYPE_MAP)
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

runTest("filters out exact-name Google matches outside the local search radius", () => {
  const suggestions = rankExternalProviderSuggestions(
    "Albert Heijn",
    { lon: 4.9, lat: 52.37 },
    [
      {
        providerId: "nearby",
        name: "Albert Heijn",
        address: "Address 1",
        location: { lon: 4.9002, lat: 52.37 }
      },
      {
        providerId: "too-far",
        name: "Albert Heijn",
        address: "Address 2",
        location: { lon: 4.908, lat: 52.37 }
      }
    ]
  );

  assert.deepEqual(
    suggestions.map((suggestion) => suggestion.providerId),
    ["nearby"]
  );
});

runTest("keeps exact-name Google matches within five hundred meters", () => {
  const suggestions = rankExternalProviderSuggestions(
    "Albert Heijn",
    { lon: 4.9, lat: 52.37 },
    [
      {
        providerId: "within-range",
        name: "Albert Heijn",
        address: "Address 1",
        location: { lon: 4.906, lat: 52.37 }
      }
    ]
  );

  assert.deepEqual(
    suggestions.map((suggestion) => suggestion.providerId),
    ["within-range"]
  );
});

runTest("falls back to nearest typed Google results within five hundred meters", () => {
  const suggestions = rankNearbyDistanceFallbackSuggestions(
    { lon: 4.9, lat: 52.37 },
    [
      {
        providerId: "nearest",
        name: "Glaspunt Service",
        address: "Address 1",
        location: { lon: 4.901, lat: 52.37 }
      },
      {
        providerId: "farther",
        name: "Autotaalglas Service",
        address: "Address 2",
        location: { lon: 4.904, lat: 52.37 }
      },
      {
        providerId: "too-far",
        name: "Other Service",
        address: "Address 3",
        location: { lon: 4.908, lat: 52.37 }
      }
    ]
  );

  assert.deepEqual(
    suggestions.map((suggestion) => suggestion.providerId),
    ["nearest", "farther"]
  );
});

runTest("suggests a likely moved provider on a strong farther name match", () => {
  const suggestions = rankMovedExternalProviderSuggestions(
    "Autotaalglas Alkmaar",
    { lon: 4.75, lat: 52.63 },
    [
      {
        providerId: "moved",
        name: "Autotaalglas Alkmaar",
        address: "Nieuwe locatie",
        location: { lon: 4.79, lat: 52.63 }
      },
      {
        providerId: "too-far",
        name: "Autotaalglas Alkmaar",
        address: "Te ver",
        location: { lon: 4.98, lat: 52.63 }
      },
      {
        providerId: "weak-name",
        name: "Glasservice Noord-Holland",
        address: "Andere naam",
        location: { lon: 4.79, lat: 52.63 }
      }
    ]
  );

  assert.deepEqual(
    suggestions.map((suggestion) => suggestion.providerId),
    ["moved"]
  );
  assert.equal(suggestions[0]?.reasonVariant, "likelyMoved");
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

runTest("uses a likely moved reason for farther strong-name suggestions", () => {
  const issue: PlaceIssue = {
    field: "externalProviderIds",
    severity: "warning",
    message: "At least one external provider id is required",
    ruleId: "externalProvider.required"
  };
  const proposals = buildExternalProviderSuggestionProposals(issue, [
    {
      providerId: "moved-provider",
      name: "Autotaalglas Alkmaar",
      address: "Nieuwe locatie",
      distanceMeters: 4200,
      nameScore: 1,
      reasonVariant: "likelyMoved"
    }
  ]);

  assert.match(proposals[0].reason, /4200/);
});
