import type { ChainDataset, ChainRecord } from "../types/chains";

function mergeChainRecord(base: ChainRecord, override: ChainRecord): ChainRecord {
  return {
    ...base,
    ...override,
    match: {
      ...base.match,
      ...override.match
    },
    standard: {
      ...base.standard,
      ...override.standard
    },
    policy: {
      ...base.policy,
      ...override.policy
    },
    scope: {
      ...base.scope,
      ...override.scope
    },
    meta: {
      ...base.meta,
      ...override.meta
    }
  };
}

export function mergeChainDatasets(
  base: ChainDataset,
  override: ChainDataset
): ChainDataset {
  const mergedItems = new Map<string, ChainRecord>();

  for (const item of base.items) {
    mergedItems.set(item.id, item);
  }

  for (const item of override.items) {
    const existing = mergedItems.get(item.id);

    if (existing) {
      mergedItems.set(item.id, mergeChainRecord(existing, item));
    } else {
      mergedItems.set(item.id, item);
    }
  }

  return {
    ...base,
    id: override.id || base.id,
    version: Math.max(base.version, override.version),
    items: Array.from(mergedItems.values())
  };
}