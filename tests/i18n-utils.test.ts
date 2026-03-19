import assert from "node:assert/strict";

import {
  getLocaleCandidates,
  resolveLocalizedTextList
} from "../src/i18n/locale-utils.ts";

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest("builds locale fallback candidates from WME locale to English", () => {
  assert.deepEqual(getLocaleCandidates("fr-FR", "nl"), ["fr-fr", "fr", "nl", "en"]);
});

runTest("resolves localized editor notes using exact locale, base locale, then English", () => {
  const notes = {
    en: ["English note"],
    fr: ["Note francaise"]
  };

  assert.deepEqual(resolveLocalizedTextList(notes, "fr-FR"), ["Note francaise"]);
  assert.deepEqual(resolveLocalizedTextList(notes, "de-DE"), ["English note"]);
});
