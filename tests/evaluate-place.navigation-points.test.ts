import assert from "node:assert/strict";

import { evaluatePlace } from "../src/rules/evaluate-place.ts";
import type { PlaceLike } from "../src/types/place.ts";

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest("flags missing navigation points for polygon venues when required", () => {
  const place: PlaceLike = {
    name: "Test Polygon Venue",
    geometry: "polygon",
    navigationPointCount: 0
  };

  const issues = evaluatePlace(place, {
    navigationPoints: "required"
  });

  assert.equal(issues.length, 1);
  assert.equal(issues[0].field, "navigationPoints");
  assert.equal(issues[0].severity, "error");
  assert.equal(issues[0].ruleId, "navigationPoints.required");
  assert.equal(issues[0].expectedValue, "present");
});

runTest("does not flag point venues for missing navigation points", () => {
  const place: PlaceLike = {
    name: "Test Point Venue",
    geometry: "point",
    navigationPointCount: 0
  };

  const issues = evaluatePlace(place, {
    navigationPoints: "required"
  });

  assert.equal(issues.length, 0);
});

runTest("accepts polygon venues that already have navigation points", () => {
  const place: PlaceLike = {
    name: "Test Polygon Venue",
    geometry: "polygon",
    navigationPointCount: 2
  };

  const issues = evaluatePlace(place, {
    navigationPoints: "required"
  });

  assert.equal(issues.length, 0);
});
