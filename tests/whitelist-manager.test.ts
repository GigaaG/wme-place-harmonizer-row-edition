import assert from "node:assert/strict";

import type { PlaceIssue } from "../src/types/issue.ts";
import type { PlaceProposal } from "../src/types/proposal.ts";
import {
  filterWhitelistedAnalysis,
  loadWhitelistStore,
  upsertWhitelistEntries
} from "../src/whitelist/manager.ts";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
  }
}

const localStorage = new MemoryStorage();

(globalThis as typeof globalThis & {
  window: { localStorage: MemoryStorage };
}).window = {
  localStorage
};

function runTest(name: string, fn: () => void): void {
  try {
    localStorage.clear();
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function buildIssue(ruleId: string): PlaceIssue {
  return {
    field: "phone",
    severity: "warning",
    message: "Phone number is not applicable here",
    ruleId
  };
}

function buildProposal(ruleId: string): PlaceProposal {
  return {
    id: `proposal-${ruleId}`,
    field: "phone",
    proposedValue: "+31 20 1234567",
    reason: "Normalize phone",
    issueRuleId: ruleId,
    isApplySupported: true,
    actionType: "set-field"
  };
}

runTest("suppresses matching issues and linked proposals for the same runtime versions", () => {
  const issues = [buildIssue("phoneValidation.format")];
  const proposals = [buildProposal("phoneValidation.format")];

  assert.equal(
    upsertWhitelistEntries([
      {
        placeId: "123",
        ruleId: "phoneValidation.format",
        field: "phone",
        scope: "place",
        createdAt: "2026-03-16T10:00:00Z",
        configId: "nl-config",
        configVersion: 3,
        chainsId: "nl-chains",
        chainsVersion: 7
      }
    ]),
    1
  );

  const result = filterWhitelistedAnalysis({
    placeId: "123",
    issues,
    proposals,
    runtime: {
      configId: "nl-config",
      configVersion: 3,
      chainsId: "nl-chains",
      chainsVersion: 7
    }
  });

  assert.equal(result.issues.length, 0);
  assert.equal(result.proposals.length, 0);
  assert.equal(result.suppressedIssueCount, 1);
});

runTest("does not suppress entries once config or chain versions change", () => {
  const issues = [buildIssue("phoneValidation.format")];

  upsertWhitelistEntries([
    {
      placeId: "123",
      ruleId: "phoneValidation.format",
      field: "phone",
      scope: "place",
      createdAt: "2026-03-16T10:00:00Z",
      configId: "nl-config",
      configVersion: 3,
      chainsId: "nl-chains",
      chainsVersion: 7
    }
  ]);

  const result = filterWhitelistedAnalysis({
    placeId: "123",
    issues,
    proposals: [],
    runtime: {
      configId: "nl-config",
      configVersion: 4,
      chainsId: "nl-chains",
      chainsVersion: 7
    }
  });

  assert.equal(result.issues.length, 1);
  assert.equal(result.suppressedIssueCount, 0);
});

runTest("updates an existing whitelist entry when the same issue is re-whitelisted on a new runtime version", () => {
  upsertWhitelistEntries([
    {
      placeId: "123",
      ruleId: "phoneValidation.format",
      field: "phone",
      scope: "place",
      createdAt: "2026-03-16T10:00:00Z",
      configId: "nl-config",
      configVersion: 3,
      chainsId: "nl-chains",
      chainsVersion: 7
    }
  ]);

  assert.equal(
    upsertWhitelistEntries([
      {
        placeId: "123",
        ruleId: "phoneValidation.format",
        field: "phone",
        scope: "place",
        createdAt: "2026-03-16T11:00:00Z",
        configId: "nl-config",
        configVersion: 4,
        chainsId: "nl-chains",
        chainsVersion: 8
      }
    ]),
    1
  );

  const store = loadWhitelistStore();

  assert.equal(store.items.length, 1);
  assert.equal(store.items[0].createdAt, "2026-03-16T10:00:00Z");
  assert.equal(store.items[0].updatedAt, "2026-03-16T11:00:00Z");
  assert.equal(store.items[0].configVersion, 4);
  assert.equal(store.items[0].chainsVersion, 8);
});

runTest("prunes stale entries for the same place when saving a newer runtime snapshot", () => {
  upsertWhitelistEntries([
    {
      placeId: "123",
      ruleId: "phoneValidation.format",
      field: "phone",
      scope: "place",
      createdAt: "2026-03-16T10:00:00Z",
      configId: "nl-config",
      configVersion: 3,
      chainsId: "nl-chains",
      chainsVersion: 7
    }
  ]);

  assert.equal(
    upsertWhitelistEntries([
      {
        placeId: "123",
        ruleId: "phoneValidation.presence",
        field: "phone",
        scope: "place",
        createdAt: "2026-03-16T11:00:00Z",
        configId: "nl-config",
        configVersion: 4,
        chainsId: "nl-chains",
        chainsVersion: 8
      }
    ]),
    1
  );

  const store = loadWhitelistStore();

  assert.equal(store.items.length, 1);
  assert.equal(store.items[0].ruleId, "phoneValidation.presence");
  assert.equal(store.items[0].configVersion, 4);
  assert.equal(store.items[0].chainsVersion, 8);
});

runTest("prunes stale entries for the current place when reading without touching other places", () => {
  upsertWhitelistEntries([
    {
      placeId: "123",
      ruleId: "phoneValidation.format",
      field: "phone",
      scope: "place",
      createdAt: "2026-03-16T10:00:00Z",
      configId: "nl-config",
      configVersion: 3,
      chainsId: "nl-chains",
      chainsVersion: 7
    },
    {
      placeId: "999",
      ruleId: "phoneValidation.format",
      field: "phone",
      scope: "place",
      createdAt: "2026-03-16T10:30:00Z",
      configId: "be-config",
      configVersion: 2,
      chainsId: "be-chains",
      chainsVersion: 5
    }
  ]);

  const result = filterWhitelistedAnalysis({
    placeId: "123",
    issues: [buildIssue("phoneValidation.format")],
    proposals: [],
    runtime: {
      configId: "nl-config",
      configVersion: 4,
      chainsId: "nl-chains",
      chainsVersion: 8
    }
  });

  const store = loadWhitelistStore();

  assert.equal(result.issues.length, 1);
  assert.equal(result.suppressedIssueCount, 0);
  assert.equal(store.items.length, 1);
  assert.equal(store.items[0].placeId, "999");
});
