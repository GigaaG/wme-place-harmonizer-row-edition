import type { HarmonizerConfig, CategoryStandard } from "../types/config";
import { logger } from "../logging/logger.ts";
import { normalizeCategoryKey } from "./category-key.ts";
import { expandCategoryHierarchy } from "./category-hierarchy.ts";

export function resolveCategoryStandards(
  config: HarmonizerConfig,
  categories: readonly unknown[]
): CategoryStandard[] {
  const standards = config.categoryStandards ?? {};
  const standardLookup = new Map<string, { key: string; standard: CategoryStandard }>();
  const matches: CategoryStandard[] = [];
  const matchedKeys = new Set<string>();

  for (const [key, standard] of Object.entries(standards)) {
    const normalizedKey = normalizeCategoryKey(key);
    if (!normalizedKey || standardLookup.has(normalizedKey)) {
      continue;
    }

    standardLookup.set(normalizedKey, { key, standard });
  }

  for (const category of categories) {
    const normalizedCategory = normalizeCategoryKey(category);
    if (!normalizedCategory) {
      continue;
    }

    for (const categoryKey of expandCategoryHierarchy(normalizedCategory)) {
      if (matchedKeys.has(categoryKey)) {
        continue;
      }

      const matched = standardLookup.get(categoryKey);
      if (matched) {
        logger.info(`Matched category standard: ${matched.key}`);
        matches.push(matched.standard);
        matchedKeys.add(categoryKey);
      }
    }
  }

  return matches;
}
