import assert from "node:assert/strict";

import { evaluatePlace } from "../src/rules/evaluate-place.ts";
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

runTest("emits informational editor notes from the matched chain", () => {
  const place: PlaceLike = {
    name: "Example Chain"
  };
  const chain: ChainRecord = {
    id: "example-chain",
    canonicalName: "Example Chain",
    editorNotes: [
      "This chain often shares parking with adjacent businesses."
    ]
  };

  const issues = evaluatePlace(place, {}, chain);

  assert.deepEqual(issues, [
    {
      field: "",
      severity: "info",
      message: "This chain often shares parking with adjacent businesses.",
      ruleId: "editorNote.chain.1"
    }
  ]);
});
