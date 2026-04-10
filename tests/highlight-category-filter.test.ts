import assert from "node:assert/strict";

import { shouldSkipVenueHighlight } from "../src/highlighter/highlight-category-filter.ts";

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest("does not skip highlighting when the setting is disabled", () => {
  assert.equal(
    shouldSkipVenueHighlight(
      {
        categories: ["NATURAL_FEATURES"]
      },
      false
    ),
    false
  );
});

runTest("skips main NATURAL_FEATURES highlights when the setting is enabled", () => {
  assert.equal(
    shouldSkipVenueHighlight(
      {
        categories: ["NATURAL_FEATURES"]
      },
      true
    ),
    true
  );
});

runTest("skips child NATURAL_FEATURES highlights when the setting is enabled", () => {
  assert.equal(
    shouldSkipVenueHighlight(
      {
        categories: [
          {
            categoryId: "NATURAL_FEATURES",
            subCategoryId: "FOREST_GROVE",
            localizedName: "Forest"
          }
        ]
      },
      true
    ),
    true
  );
});

runTest("keeps unrelated highlights when the setting is enabled", () => {
  assert.equal(
    shouldSkipVenueHighlight(
      {
        categories: ["PARK"]
      },
      true
    ),
    false
  );
});
