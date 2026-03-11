import type { HarmonizerConfig, CategoryStandard } from "../types/config";
import { logger } from "../logging/logger";

export function resolveCategoryStandards(
  config: HarmonizerConfig,
  categories: string[]
): CategoryStandard[] {
  const standards = config.categoryStandards ?? {};
  const matches: CategoryStandard[] = [];

  for (const category of categories) {
    const standard = standards[category];
    if (standard) {
      logger.info(`Matched category standard: ${category}`);
      matches.push(standard);
    }
  }

  return matches;
}