import assert from "node:assert/strict";

import { evaluatePlace } from "../src/rules/evaluate-place.ts";
import { generateProposals } from "../src/proposals/generate-proposals.ts";
import { resolveEffectivePolicy } from "../src/config/effective-policy.ts";
import type { CategoryStandard, RuleConfig } from "../src/types/config.ts";
import type { ChainRecord } from "../src/types/chains.ts";
import type { PlaceLike } from "../src/types/place.ts";

const enabledRule: RuleConfig = {
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

function buildPlace(name: string, city = "Amsterdam"): PlaceLike {
  return {
    name,
    address: {
      city
    }
  };
}

runTest("reports and proposes removing a trailing city from the venue name", () => {
  const issues = evaluatePlace(buildPlace("Starbucks Amsterdam"), {}, undefined, {
    cityInVenueNameRule: enabledRule
  });

  assert.equal(issues.length, 1);
  assert.equal(issues[0].ruleId, "cityInVenueName");
  assert.equal(issues[0].field, "name");
  assert.equal(issues[0].expectedValue, "Starbucks");

  const proposals = generateProposals(issues);
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].field, "name");
  assert.equal(proposals[0].proposedValue, "Starbucks");
  assert.equal(proposals[0].isApplySupported, true);
});

runTest("does not report when the global rule is disabled", () => {
  const issues = evaluatePlace(buildPlace("Starbucks Amsterdam"), {}, undefined, {
    cityInVenueNameRule: {
      enabled: false,
      severity: "warning"
    }
  });

  assert.equal(issues.length, 0);
});

runTest("allows category policy to disable the city-name cleanup", () => {
  const categoryStandard: CategoryStandard = {
    cityInVenueName: false
  };
  const policy = resolveEffectivePolicy({
    categoryStandards: [categoryStandard]
  });

  const issues = evaluatePlace(buildPlace("Cinema Amsterdam"), policy, undefined, {
    cityInVenueNameRule: enabledRule
  });

  assert.equal(issues.length, 0);
});

runTest("allows chain policy to disable the city-name cleanup", () => {
  const chain: ChainRecord = {
    id: "test-chain",
    canonicalName: "Test Chain",
    policy: {
      cityInVenueName: false
    }
  };
  const policy = resolveEffectivePolicy({
    categoryStandards: [],
    chainPolicy: chain.policy
  });

  const issues = evaluatePlace(buildPlace("Test Chain Amsterdam"), policy, chain, {
    cityInVenueNameRule: enabledRule
  });

  assert.equal(issues.length, 0);
});

runTest("skips city cleanup when a chain standard name already drives normalization", () => {
  const chain: ChainRecord = {
    id: "test-chain",
    canonicalName: "Starbucks",
    standard: {
      name: "Starbucks"
    }
  };

  const issues = evaluatePlace(buildPlace("Starbucks Amsterdam"), {}, chain, {
    cityInVenueNameRule: enabledRule
  });

  assert.deepEqual(issues.map((issue) => issue.ruleId), ["nameNormalization"]);
});
