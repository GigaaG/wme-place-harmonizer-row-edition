import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { normalizeCategoryKeys } from "../src/config/category-key.ts";
import { resolveEffectivePolicy } from "../src/config/effective-policy.ts";
import { evaluatePlace } from "../src/rules/evaluate-place.ts";
import type { HarmonizerConfig, RuleConfig } from "../src/types/config.ts";
import type { PlaceLike } from "../src/types/place.ts";

const runtimeConfig: HarmonizerConfig = {
  id: "test-config",
  type: "country-config",
  version: 1,
  categoryStandards: {
    FOREST_GROVE: {
      geometry: {
        recommended: "polygon",
        allowed: ["point", "polygon"]
      },
      lockLevel: 2,
      navigationPoints: "required"
    },
    BUS_STATION: {
      editorNotes: [
        "In the Netherlands, bus stops are not considered bus stations."
      ]
    }
  }
};

const nlConfig = JSON.parse(
  readFileSync(
    new URL("../../wme-place-harmonizer-row-data/config/countries/nl.json", import.meta.url),
    "utf8"
  )
) as HarmonizerConfig;

const enabledCityRule: RuleConfig = {
  enabled: true,
  severity: "warning"
};

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest("falls back to descriptive category fields when ids are opaque", () => {
  assert.deepEqual(normalizeCategoryKeys([{ id: "183", name: "Forest Grove" }]), [
    "FOREST_GROVE"
  ]);
});

runTest("prefers canonical SDK subcategory ids over localized names", () => {
  assert.deepEqual(
    normalizeCategoryKeys([
      {
        categoryId: "NATURAL_FEATURES",
        subCategoryId: "FOREST_GROVE",
        localizedName: "Forest"
      }
    ]),
    ["FOREST_GROVE"]
  );
});

runTest("applies Forest Grove standards when sdk category objects include numeric ids", () => {
  const rawCategories = [{ id: "183", name: "Forest Grove" }];
  const normalizedCategories = normalizeCategoryKeys(rawCategories);
  const categoryStandards = normalizedCategories
    .map((category) => runtimeConfig.categoryStandards?.[category])
    .filter((standard) => standard !== undefined);
  const place: PlaceLike = {
    name: "Test Forest",
    categories: normalizedCategories,
    geometry: "point",
    lockLevel: 1
  };

  assert.equal(categoryStandards.length, 1);

  const issues = evaluatePlace(
    place,
    resolveEffectivePolicy({ categoryStandards })
  );

  assert.deepEqual(
    issues.map((issue) => issue.ruleId),
    ["geometry.recommended", "lockLevelRecommendation"]
  );
});

runTest("applies category navigation-point standards only to polygon venues", () => {
  const rawCategories = [{ id: "183", name: "Forest Grove" }];
  const normalizedCategories = normalizeCategoryKeys(rawCategories);
  const categoryStandards = normalizedCategories
    .map((category) => runtimeConfig.categoryStandards?.[category])
    .filter((standard) => standard !== undefined);
  const place: PlaceLike = {
    name: "Polygon Forest",
    categories: normalizedCategories,
    geometry: "polygon",
    lockLevel: 1,
    navigationPointCount: 0
  };

  const issues = evaluatePlace(
    place,
    resolveEffectivePolicy({ categoryStandards })
  );

  assert.equal(categoryStandards.length, 1);
  assert.deepEqual(
    issues.map((issue) => issue.ruleId).sort(),
    ["lockLevelRecommendation", "navigationPoints.required"]
  );
});

runTest("emits informational editor notes from matched category standards", () => {
  const rawCategories = ["BUS_STATION"];
  const normalizedCategories = normalizeCategoryKeys(rawCategories);
  const categoryStandards = normalizedCategories
    .map((category) => runtimeConfig.categoryStandards?.[category])
    .filter((standard) => standard !== undefined);
  const place: PlaceLike = {
    name: "Test Bus Station",
    categories: normalizedCategories
  };

  const issues = evaluatePlace(
    place,
    resolveEffectivePolicy({ categoryStandards })
  );

  assert.deepEqual(issues, [
    {
      field: "",
      severity: "info",
      message: "In the Netherlands, bus stops are not considered bus stations.",
      ruleId: "editorNote.category.1"
    }
  ]);
});

runTest("allows NL train stations to keep the city name in the venue name", () => {
  const rawCategories = ["TRAIN_STATION"];
  const normalizedCategories = normalizeCategoryKeys(rawCategories);
  const categoryStandards = normalizedCategories
    .map((category) => nlConfig.categoryStandards?.[category])
    .filter((standard) => standard !== undefined);
  const place: PlaceLike = {
    name: "Amsterdam Centraal",
    categories: normalizedCategories,
    address: {
      city: "Amsterdam"
    }
  };

  const issues = evaluatePlace(
    place,
    resolveEffectivePolicy({ categoryStandards }),
    undefined,
    {
      cityInVenueNameRule: enabledCityRule
    }
  );

  assert.equal(categoryStandards.length, 1);
  assert.equal(issues.some((issue) => issue.ruleId === "cityInVenueName"), false);
});

runTest("requires external provider ids for NL restaurants", () => {
  const rawCategories = ["RESTAURANT"];
  const normalizedCategories = normalizeCategoryKeys(rawCategories);
  const categoryStandards = normalizedCategories
    .map((category) => nlConfig.categoryStandards?.[category])
    .filter((standard) => standard !== undefined);
  const place: PlaceLike = {
    name: "Test Restaurant",
    categories: normalizedCategories
  };

  const issues = evaluatePlace(
    place,
    resolveEffectivePolicy({ categoryStandards })
  );

  assert.equal(categoryStandards.length, 1);
  assert.equal(
    issues.some((issue) => issue.ruleId === "externalProvider.required"),
    true
  );
});
