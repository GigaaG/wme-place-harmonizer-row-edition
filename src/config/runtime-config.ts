import { logger } from "../logging/logger";
import { loadConfigFile } from "./config-loader";
import { mergeConfigs } from "./config-merger";
import type { HarmonizerConfig } from "../types/config";

export async function resolveRuntimeConfig(
  country?: string
): Promise<HarmonizerConfig> {

  const globalConfig = await loadConfigFile("config/global.json");

  if (!country) {
    logger.info("Using global config only");
    return globalConfig;
  }

  try {
    const countryConfig = await loadConfigFile(
      `config/countries/${country}.json`
    );

    logger.info(`Applying country config: ${country}`);

    return mergeConfigs(globalConfig, countryConfig);
  } catch {
    logger.warn(`Country config not found for ${country}, using global`);

    return globalConfig;
  }
}