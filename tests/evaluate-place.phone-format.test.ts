import assert from "node:assert/strict";

import { evaluatePlace } from "../src/rules/evaluate-place.ts";
import type { EffectivePlacePolicy } from "../src/types/policy.ts";
import type { PlaceLike } from "../src/types/place.ts";
import type { PhoneFormattingConfig } from "../src/types/config.ts";

const dutchPhoneFormatting: PhoneFormattingConfig = {
  countryCode: "+31",
  formatStyle: "international",
  validationPatterns: [
    "^\\+31 [1-57]\\d \\d{7}$",
    "^\\+31 [1-57]\\d{2} \\d{6}$",
    "^\\+31 6 \\d{8}$",
    "^\\+(?!31)\\d{1,3}(?: \\d{1,14})+$",
    "^0800 \\d+$",
    "^0900 \\d+$"
  ],
  validationMessage:
    "Phone number must use Dutch international format (+31 AA BBBBBBB, +31 AAA BBBBBB or +31 6 CBBBBBBB), or another country code in international +CC ... format, unless it is an 0800 or 0900 service number"
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
