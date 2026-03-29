import type { PlaceIssue } from "../types/issue";
import type { PlaceProposal } from "../types/proposal";
import { APP_STORAGE_PREFIX } from "../constants/app.ts";
import type {
  WhitelistEntry,
  WhitelistFilterResult,
  WhitelistRuntimeSnapshot,
  WhitelistStore
} from "../types/whitelist";

const WHITELIST_STORE_VERSION = 1;

function getWhitelistStorageKey(): string {
  return `${APP_STORAGE_PREFIX}:whitelist`;
}

function getDefaultStore(): WhitelistStore {
  return {
    version: WHITELIST_STORE_VERSION,
    items: []
  };
}

function isValidEntry(value: unknown): value is WhitelistEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Partial<WhitelistEntry>;

  return (
    typeof entry.placeId === "string" &&
    typeof entry.ruleId === "string" &&
    typeof entry.field === "string" &&
    entry.scope === "place" &&
    typeof entry.createdAt === "string" &&
    typeof entry.configId === "string" &&
    typeof entry.configVersion === "number" &&
    typeof entry.chainsId === "string" &&
    typeof entry.chainsVersion === "number"
  );
}

function isValidStore(value: unknown): value is WhitelistStore {
  if (!value || typeof value !== "object") {
    return false;
  }

  const store = value as Partial<WhitelistStore>;

  return (
    store.version === WHITELIST_STORE_VERSION &&
    Array.isArray(store.items) &&
    store.items.every((item) => isValidEntry(item))
  );
}

function buildWhitelistKey(params: {
  placeId: string;
  ruleId: string;
  field: string;
}): string {
  return `${params.placeId}::${params.ruleId}::${params.field}`;
}

function isEntryActive(
  entry: WhitelistEntry,
  runtime: WhitelistRuntimeSnapshot
): boolean {
  return (
    entry.configId === runtime.configId &&
    entry.configVersion === runtime.configVersion &&
    entry.chainsId === runtime.chainsId &&
    entry.chainsVersion === runtime.chainsVersion
  );
}

function getLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadWhitelistStore(): WhitelistStore {
  const storage = getLocalStorage();

  if (!storage) {
    return getDefaultStore();
  }

  const raw = storage.getItem(getWhitelistStorageKey());

  if (!raw) {
    return getDefaultStore();
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isValidStore(parsed)) {
      return getDefaultStore();
    }

    return parsed;
  } catch {
    return getDefaultStore();
  }
}

export function saveWhitelistStore(store: WhitelistStore): void {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  storage.setItem(getWhitelistStorageKey(), JSON.stringify(store));
}

export function upsertWhitelistEntries(entries: WhitelistEntry[]): number {
  if (entries.length === 0) {
    return 0;
  }

  const current = loadWhitelistStore();
  const keyedEntries = new Map<string, WhitelistEntry>();

  for (const existing of current.items) {
    keyedEntries.set(
      buildWhitelistKey(existing),
      existing
    );
  }

  let changed = 0;

  for (const entry of entries) {
    const key = buildWhitelistKey(entry);
    const existing = keyedEntries.get(key);

    if (!existing) {
      keyedEntries.set(key, entry);
      changed += 1;
      continue;
    }

    if (
      existing.configId !== entry.configId ||
      existing.configVersion !== entry.configVersion ||
      existing.chainsId !== entry.chainsId ||
      existing.chainsVersion !== entry.chainsVersion
    ) {
      keyedEntries.set(key, {
        ...existing,
        ...entry,
        createdAt: existing.createdAt,
        updatedAt: entry.createdAt
      });
      changed += 1;
    }
  }

  saveWhitelistStore({
    version: WHITELIST_STORE_VERSION,
    items: Array.from(keyedEntries.values())
  });

  return changed;
}

export function filterWhitelistedAnalysis(params: {
  placeId: string;
  issues: PlaceIssue[];
  proposals: PlaceProposal[];
  runtime: WhitelistRuntimeSnapshot;
  store?: WhitelistStore;
}): WhitelistFilterResult {
  const store = params.store ?? loadWhitelistStore();

  if (store.items.length === 0) {
    return {
      issues: params.issues,
      proposals: params.proposals,
      suppressedIssueCount: 0
    };
  }

  const activeKeys = new Set(
    store.items
      .filter((entry) => isEntryActive(entry, params.runtime))
      .map((entry) => buildWhitelistKey(entry))
  );

  if (activeKeys.size === 0) {
    return {
      issues: params.issues,
      proposals: params.proposals,
      suppressedIssueCount: 0
    };
  }

  const suppressedIssueKeys = new Set<string>();
  const visibleIssues: PlaceIssue[] = [];

  for (const issue of params.issues) {
    const ruleId = issue.ruleId;

    if (!ruleId) {
      visibleIssues.push(issue);
      continue;
    }

    const key = buildWhitelistKey({
      placeId: params.placeId,
      ruleId,
      field: issue.field
    });

    if (activeKeys.has(key)) {
      suppressedIssueKeys.add(key);
      continue;
    }

    visibleIssues.push(issue);
  }

  if (suppressedIssueKeys.size === 0) {
    return {
      issues: params.issues,
      proposals: params.proposals,
      suppressedIssueCount: 0
    };
  }

  const visibleProposals = params.proposals.filter((proposal) => {
    if (!proposal.issueRuleId) {
      return true;
    }

    const key = buildWhitelistKey({
      placeId: params.placeId,
      ruleId: proposal.issueRuleId,
      field: proposal.field
    });

    return !suppressedIssueKeys.has(key);
  });

  return {
    issues: visibleIssues,
    proposals: visibleProposals,
    suppressedIssueCount: params.issues.length - visibleIssues.length
  };
}
