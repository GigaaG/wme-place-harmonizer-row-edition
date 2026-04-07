import assert from "node:assert/strict";

import { evaluatePlace } from "../src/rules/evaluate-place.ts";
import { generateProposals } from "../src/proposals/generate-proposals.ts";
import type { EffectivePlacePolicy } from "../src/types/policy.ts";
import type { PlaceLike } from "../src/types/place.ts";
import type { UrlFormattingConfig } from "../src/types/config.ts";
import type { PlaceIssue } from "../src/types/issue.ts";

const dutchUrlFormatting: UrlFormattingConfig = {
  validationPatterns: [
    "^https?:\\/\\/(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\\.)+[A-Za-z]{2,63}(?::\\d{1,5})?(?:[/?#][^\\s]*)?$"
  ],
  validationExamples: [
    "https://www.casca.nl",
    "https://tickets.example.nl",
    "https://example.com/en",
    "https://info.example.co.uk?lang=en"
  ],
  validationMessageKey: "config.validation.url.generic"
};

function buildPlace(url?: string): PlaceLike {
  return {
    name: "Test venue",
    url
  };
}

function getUrlIssueRuleIds(
  url: string | undefined,
  policy: EffectivePlacePolicy = {}
): string[] {
  return evaluatePlace(buildPlace(url), policy, undefined, {
    urlFormatting: dutchUrlFormatting
  })
    .filter((issue) => issue.field === "url")
    .map((issue) => issue.ruleId ?? "");
}

function getUrlFormatIssue(url: string): PlaceIssue | undefined {
  return evaluatePlace(buildPlace(url), {}, undefined, {
    urlFormatting: dutchUrlFormatting
  }).find((issue) => issue.ruleId === "urlValidation.format");
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

runTest("accepts protocol-prefixed URLs with or without subdomains", () => {
  const validUrls = [
    "https://www.casca.nl",
    "http://tickets.example.nl",
    "https://example.com",
    "https://example.com/en",
    "https://shop.example.co.uk?lang=en",
    "https://sub.example.org#contact"
  ];

  for (const url of validUrls) {
    assert.deepEqual(getUrlIssueRuleIds(url), [], url);
  }
});

runTest("reports protocol-less and malformed URLs", () => {
  const invalidUrls = [
    "www.casca.nl",
    "tickets.example.nl/en",
    "ftp://example.com",
    "www example nl",
    "example"
  ];

  for (const url of invalidUrls) {
    assert.deepEqual(getUrlIssueRuleIds(url), ["urlValidation.format"], url);
  }
});

runTest("keeps presence and format validation independent", () => {
  assert.deepEqual(
    getUrlIssueRuleIds(undefined, { url: "required" }),
    ["urlValidation.required"]
  );

  assert.deepEqual(
    getUrlIssueRuleIds("https://www.casca.nl", { url: "forbidden" }),
    ["urlValidation.forbidden"]
  );

  assert.deepEqual(
    getUrlIssueRuleIds("www.casca.nl", { url: "forbidden" }),
    ["urlValidation.forbidden", "urlValidation.format"]
  );
});

runTest("treats optional URL presence as neutral", () => {
  assert.deepEqual(getUrlIssueRuleIds(undefined, { url: "optional" }), []);
  assert.deepEqual(
    getUrlIssueRuleIds("https://www.casca.nl", { url: "optional" }),
    []
  );
});

runTest("creates applyable URL-format proposals when adding https fixes it", () => {
  const issue = getUrlFormatIssue("tickets.example.nl/en");

  assert.ok(issue);
  assert.equal(issue.expectedValue, "https://tickets.example.nl/en");

  const proposals = generateProposals([issue]);

  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].field, "url");
  assert.equal(proposals[0].proposedValue, "https://tickets.example.nl/en");
  assert.equal(proposals[0].issueRuleId, "urlValidation.format");
  assert.equal(proposals[0].isApplySupported, true);
  assert.equal(proposals[0].actionType, "set-field");
});
