import assert from "node:assert/strict";

import { evaluatePlace } from "../src/rules/evaluate-place.ts";
import { generateProposals } from "../src/proposals/generate-proposals.ts";
import type { ChainRecord } from "../src/types/chains.ts";
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

runTest("suggests missing chain aliases and creates applyable alias proposals", () => {
  const place: PlaceLike = {
    name: "Starbucks"
  };
  const chain: ChainRecord = {
    id: "starbucks",
    canonicalName: "Starbucks",
    standard: {
      aliases: ["Starbucks Coffee"],
      optionalAliases: ["SBX"]
    }
  };

  const issues = evaluatePlace(place, {}, chain);

  assert.equal(issues.length, 2);
  assert.deepEqual(
    issues.map((issue) => issue.field),
    ["aliases", "aliases"]
  );
  assert.deepEqual(
    issues.map((issue) => issue.groupKey),
    ["aliases.suggested", "aliases.suggested"]
  );
  assert.deepEqual(
    issues.map((issue) => issue.expectedValue),
    ["Starbucks Coffee", "SBX"]
  );

  const proposals = generateProposals(issues);

  assert.equal(proposals.length, 2);
  assert.deepEqual(
    proposals.map((proposal) => proposal.aliasName),
    ["Starbucks Coffee", "SBX"]
  );
  assert.ok(proposals.every((proposal) => proposal.field === "aliases"));
  assert.ok(proposals.every((proposal) => proposal.actionType === "add-alias"));
  assert.ok(proposals.every((proposal) => proposal.isApplySupported));
  assert.ok(proposals.every((proposal) => proposal.id));
});

runTest("does not suggest aliases already present after normalization", () => {
  const place: PlaceLike = {
    name: "Starbucks",
    aliases: [" Starbucks   Coffee "]
  };
  const chain: ChainRecord = {
    id: "starbucks",
    canonicalName: "Starbucks",
    standard: {
      aliases: ["Starbucks Coffee"]
    }
  };

  const issues = evaluatePlace(place, {}, chain);

  assert.equal(issues.length, 0);
});
