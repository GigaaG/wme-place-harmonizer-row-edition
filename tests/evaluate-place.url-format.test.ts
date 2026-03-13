import assert from "node:assert/strict";

import { evaluatePlace } from "../src/rules/evaluate-place.ts";
import { generateProposals } from "../src/proposals/generate-proposals.ts";
import type { EffectivePlacePolicy } from "../src/types/policy.ts";
import type { PlaceLike } from "../src/types/place.ts";
import type { UrlFormattingConfig } from "../src/types/config.ts";
import type { PlaceIssue } from "../src/types/issue.ts";

const dutchUrlFormatting: UrlFormattingConfig = {
  validationPatterns: [
    "^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\\.)+[A-Za-z]{2,63}(?::\\d{1,5})?(?:[/?#][^\\s]*)?$"
  ],
  validationExamples: [
    "www.casca.nl",
    "tickets.example.nl",
    "example.com/en",
    "info.example.co.uk?lang=en"
  ],
  validationMessage:
    "URL must omit http:// or https:// and use only the hostname, optionally with a port, path, query or fragment"
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

runTest("accepts hostname-only URLs with or without subdomains", () => {
  const validUrls = [
    "www.casca.nl",
    "tickets.example.nl",
    "example.com",
    "example.com/en",
    "shop.example.co.uk?lang=en",
    "sub.example.org#contact"
  ];

  for (const url of validUrls) {
    assert.deepEqual(getUrlIssueRuleIds(url), [], url);
  }
});

runTest("reports protocol-prefixed and malformed URLs", () => {
  const invalidUrls = [
    "https://www.casca.nl",
    "HTTP://tickets.example.nl/en",
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
    ["urlValidation.forbidden", "urlValidation.format"]
  );
});

runTest("creates applyable URL-format proposals when protocol stripping fixes it", () => {
  const issue = getUrlFormatIssue("https://tickets.example.nl/en");

  assert.ok(issue);
  assert.equal(issue.expectedValue, "tickets.example.nl/en");

  const proposals = generateProposals([issue]);

  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].field, "url");
  assert.equal(proposals[0].proposedValue, "tickets.example.nl/en");
  assert.equal(proposals[0].issueRuleId, "urlValidation.format");
  assert.equal(proposals[0].isApplySupported, true);
  assert.equal(proposals[0].actionType, "set-field");
});
