import { logger } from "../logging/logger";
import { loadConfigFile } from "./config-loader";
import { mergeConfigs } from "./config-merger";
import type { HarmonizerConfig } from "../types/config";
import { getCountryCodeCandidates } from "./country-code";

export async function resolveRuntimeConfig(
  country?: string
): Promise<HarmonizerConfig> {
  const countryCandidates = getCountryCodeCandidates(country);

  const globalConfig = await loadConfigFile("config/global.json");

  if (countryCandidates.length === 0) {
    logger.info("Using global config only");
    return globalConfig;
  }

  for (const countryCode of countryCandidates) {
    try {
      const countryConfig = await loadConfigFile(
        `config/countries/${countryCode}.json`
      );

      logger.info(`Applying country config: ${countryCode}`);

      return mergeConfigs(globalConfig, countryConfig);
    } catch {
      // Try next candidate
    }
  }

  logger.warn(`Country config not found for ${countryCandidates.join(", ")}, using global`);

  return globalConfig;
}
