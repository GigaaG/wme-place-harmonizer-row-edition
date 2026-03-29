import type { ChainDataset, ChainRecord } from "../types/chains.ts";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function deepMerge<T>(base: T, override: T): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override;
  }

  const result: Record<string, unknown> = {
    ...base
  };

  for (const [key, overrideValue] of Object.entries(override)) {
    const baseValue = result[key];

    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      result[key] = deepMerge(baseValue, overrideValue);
      continue;
    }

    result[key] = overrideValue;
  }

  return result as T;
}

function mergeChainRecord(base: ChainRecord, override: ChainRecord): ChainRecord {
  return deepMerge(base, override);
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
