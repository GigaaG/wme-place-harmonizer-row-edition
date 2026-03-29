import assert from "node:assert/strict";

import { evaluatePlace } from "../src/rules/evaluate-place.ts";
import { generateProposals } from "../src/proposals/generate-proposals.ts";
import type { ChainRecord, OpeningHourDefinition } from "../src/types/chains.ts";
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

const template: OpeningHourDefinition[] = [
  {
    days: [1, 2, 3, 4, 5],
    fromHour: "09:00",
    toHour: "18:00"
  }
];

function buildChain(): ChainRecord {
  return {
    id: "test-chain",
    canonicalName: "Test Chain",
    standard: {
      openingHoursTemplate: template
    },
    policy: {},
    match: {}
  };
}

runTest("flags required opening hours when missing", () => {
  const place: PlaceLike = {
    name: "Test Place"
  };

  const issues = evaluatePlace(place, {
    openingHours: "required"
  });

  assert.equal(issues.length, 1);
  assert.equal(issues[0].field, "openingHours");
  assert.equal(issues[0].severity, "error");
  assert.equal(issues[0].ruleId, "openingHours.required");
  assert.equal(issues[0].expectedValue, "present");
});

runTest("shows a warning when chain opening-hours template exists but venue has none", () => {
  const place: PlaceLike = {
    name: "Test Place"
  };

  const issues = evaluatePlace(place, {}, buildChain());

  assert.equal(issues.length, 1);
  assert.equal(issues[0].field, "openingHours");
  assert.equal(issues[0].severity, "warning");
  assert.equal(issues[0].ruleId, "openingHours.template");
  assert.deepEqual(issues[0].expectedValue, template);

  const proposals = generateProposals(issues);

  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].field, "openingHours");
  assert.equal(proposals[0].isApplySupported, true);
  assert.deepEqual(proposals[0].proposedValue, template);
});

runTest("shows a warning when venue opening hours differ from the chain template", () => {
  const place: PlaceLike = {
    name: "Test Place",
    openingHours: [
      {
        days: [1, 2, 3, 4, 5],
        fromHour: "10:00",
        toHour: "18:00"
      }
    ]
  };

  const issues = evaluatePlace(place, {}, buildChain());

  assert.equal(issues.length, 1);
  assert.equal(issues[0].field, "openingHours");
  assert.equal(issues[0].severity, "warning");
  assert.equal(issues[0].ruleId, "openingHours.template");
  assert.deepEqual(issues[0].currentValue, place.openingHours);
  assert.deepEqual(issues[0].expectedValue, template);
});
