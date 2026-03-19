import assert from "node:assert/strict";

import { evaluatePlace } from "../src/rules/evaluate-place.ts";
import { generateProposals } from "../src/proposals/generate-proposals.ts";
import type { EffectivePlacePolicy } from "../src/types/policy.ts";
import type { PlaceLike } from "../src/types/place.ts";
import type { PhoneFormattingConfig } from "../src/types/config.ts";
import type { PlaceIssue } from "../src/types/issue.ts";

const dutchPhoneFormatting: PhoneFormattingConfig = {
  countryCode: "+31",
  formatStyle: "international",
  validationPatterns: [
    "^\\+31 (?:[1-57]\\d|88) \\d{7}$",
    "^\\+31 [1-57]\\d{2} \\d{6}$",
    "^\\+31 6 \\d{8}$",
    "^\\+(?!31)\\d{1,3}(?: \\d{1,14})+$",
    "^0800 \\d+$",
    "^0900 \\d+$"
  ],
  validationMessageKey: "config.validation.phone.nl"
};

function buildPlace(phone?: string): PlaceLike {
  return {
    name: "Test venue",
    phone
  };
}

function getPhoneIssueRuleIds(
  phone: string | undefined,
  policy: EffectivePlacePolicy = {}
): string[] {
  return evaluatePlace(buildPlace(phone), policy, undefined, {
    phoneFormatting: dutchPhoneFormatting
  })
    .filter((issue) => issue.field === "phone")
    .map((issue) => issue.ruleId ?? "");
}

function getPhoneFormatIssue(phone: string): PlaceIssue | undefined {
  return evaluatePlace(buildPlace(phone), {}, undefined, {
    phoneFormatting: dutchPhoneFormatting
  }).find((issue) => issue.ruleId === "phoneValidation.format");
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

runTest("accepts Dutch international and service-number formats", () => {
  const validPhones = [
    "+31 20 1234567",
    "+31 113 123456",
    "+31 88 0708090",
    "+31 6 12345678",
    "+32 3 123 45 67",
    "+44 20 7946 0018",
    "0800 1234",
    "0900 8844"
  ];

  for (const phone of validPhones) {
    assert.deepEqual(getPhoneIssueRuleIds(phone), [], phone);
  }
});

runTest("reports invalid Dutch phone formats", () => {
  const invalidPhones = [
    "020 1234567",
    "+31 61 2345678",
    "+31 20 123 4567",
    "+31201234567",
    "+3221234567",
    "08001234",
    "09008844"
  ];

  for (const phone of invalidPhones) {
    assert.deepEqual(getPhoneIssueRuleIds(phone), ["phoneValidation.format"], phone);
  }
});

runTest("keeps presence and format validation independent", () => {
  assert.deepEqual(
    getPhoneIssueRuleIds(undefined, { phone: "required" }),
    ["phoneValidation.required"]
  );

  assert.deepEqual(
    getPhoneIssueRuleIds("06 12345678", { phone: "forbidden" }),
    ["phoneValidation.forbidden", "phoneValidation.format"]
  );
});

runTest("creates applyable phone-format proposals for normalizable numbers", () => {
  const issue = getPhoneFormatIssue("020-1234567");

  assert.ok(issue);
  assert.equal(issue.expectedValue, "+31 20 1234567");

  const proposals = generateProposals([issue]);

  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].field, "phone");
  assert.equal(proposals[0].proposedValue, "+31 20 1234567");
  assert.equal(proposals[0].issueRuleId, "phoneValidation.format");
  assert.equal(proposals[0].isApplySupported, true);
  assert.equal(proposals[0].actionType, "set-field");
});

runTest("normalizes service and international separator variants when possible", () => {
  assert.equal(getPhoneFormatIssue("08001234")?.expectedValue, "0800 1234");
  assert.equal(
    getPhoneFormatIssue("+31 (0)20 123 4567")?.expectedValue,
    "+31 20 1234567"
  );
  assert.equal(
    getPhoneFormatIssue("+3188 070 8090")?.expectedValue,
    "+31 88 0708090"
  );
  assert.equal(
    getPhoneFormatIssue("0032-3-123-45-67")?.expectedValue,
    "+32 3 123 45 67"
  );
});
