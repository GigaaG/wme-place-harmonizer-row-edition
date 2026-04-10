import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import type { LocaleFile } from "../src/types/i18n.ts";
import { setRuntimeLocale } from "../src/i18n/runtime.ts";
import { validateUrlAvailability, resetUrlAvailabilityCache } from "../src/rules/url-availability.ts";

type MockResponse =
  | { type: "load"; status: number }
  | { type: "error" }
  | { type: "timeout" };

const requestLog: string[] = [];
const responseQueue: MockResponse[] = [];

const englishLocale = JSON.parse(
  readFileSync(
    new URL("../../wme-place-harmonizer-row-data/locales/en.json", import.meta.url),
    "utf8"
  )
) as LocaleFile;

function createMockRequester() {
  return ({
    url,
    onload,
    onerror
  }: {
    url: string;
    onload: (response: { status: number }) => void;
    onerror: () => void;
  }) => {
    requestLog.push(url);
    const next = responseQueue.shift();

    if (!next || next.type === "timeout") {
      return;
    }

    if (next.type === "error") {
      onerror();
      return;
    }

    onload({ status: next.status });
  };
}

async function runTest(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    requestLog.length = 0;
    responseQueue.length = 0;
    resetUrlAvailabilityCache();
    setRuntimeLocale(englishLocale);
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  } finally {
    setRuntimeLocale(englishLocale);
  }
}

await runTest("returns no issue when the URL responds successfully", async () => {
  responseQueue.push({ type: "load", status: 200 });
  const url = "https://example.com";
  const requester = createMockRequester();

  const issue = await validateUrlAvailability(url, requester);

  assert.equal(issue, undefined);
  assert.equal(requestLog.filter((entry) => entry === url).length, 1);
});

await runTest("reports unreachable URLs with the HTTP status code", async () => {
  responseQueue.push({ type: "load", status: 404 });
  const requester = createMockRequester();

  const issue = await validateUrlAvailability("https://example.com/missing", requester);

  assert.ok(issue);
  assert.equal(issue.ruleId, "urlValidation.availability");
  assert.equal(issue.message, "URL appears unavailable (HTTP 404)");
});

await runTest("treats redirects as unavailable URLs", async () => {
  responseQueue.push({ type: "load", status: 301 });
  const requester = createMockRequester();

  const issue = await validateUrlAvailability("https://example.com/old", requester);

  assert.ok(issue);
  assert.equal(issue.ruleId, "urlValidation.availability");
  assert.equal(issue.message, "URL appears unavailable (HTTP 301)");
});

await runTest("reports network failures", async () => {
  responseQueue.push({ type: "error" });
  const requester = createMockRequester();

  const issue = await validateUrlAvailability("https://example.com/offline", requester);

  assert.ok(issue);
  assert.equal(issue.message, "URL appears unavailable (network error)");
});

await runTest("reuses cached availability results for repeated checks", async () => {
  responseQueue.push({ type: "load", status: 410 });
  const url = "https://example.com/closed";
  const requester = createMockRequester();

  const firstIssue = await validateUrlAvailability(url, requester);
  const secondIssue = await validateUrlAvailability(url, requester);

  assert.ok(firstIssue);
  assert.ok(secondIssue);
  assert.equal(secondIssue.message, "URL appears unavailable (HTTP 410)");
  assert.equal(requestLog.filter((entry) => entry === url).length, 1);
});
