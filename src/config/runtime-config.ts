import { logger } from "../logging/logger";
import { loadConfigFile } from "./config-loader";
import { mergeConfigs } from "./config-merger";
import type { HarmonizerConfig } from "../types/config";
import { getCountryCodeCandidates } from "./country-code";

function resolveConfigExtendsPath(extendsId: string): string {
  if (extendsId === "global") {
    return "config/global.json";
  }

  if (extendsId.startsWith("community:")) {
    return `config/communities/${extendsId.slice("community:".length)}.json`;
  }

  if (extendsId.startsWith("country:")) {
    return `config/countries/${extendsId.slice("country:".length)}.json`;
  }

  if (extendsId.startsWith("state:")) {
    return `config/states/${extendsId.slice("state:".length)}.json`;
  }

  throw new Error(`Unsupported config extends reference: ${extendsId}`);
}

async function loadResolvedConfig(
  path: string,
  seen: Set<string> = new Set()
): Promise<HarmonizerConfig> {
  if (seen.has(path)) {
    throw new Error(`Circular config inheritance detected for ${path}`);
  }

  seen.add(path);

  const config = await loadConfigFile(path);

  if (!config.extends) {
    return config;
  }

  const parentPath = resolveConfigExtendsPath(config.extends);
  const parent = await loadResolvedConfig(parentPath, seen);

  return mergeConfigs(parent, config);
}

export async function resolveRuntimeConfig(
  country?: string
): Promise<HarmonizerConfig> {
  const countryCandidates = getCountryCodeCandidates(country);
  const globalConfig = await loadResolvedConfig("config/global.json");

  if (countryCandidates.length === 0) {
    logger.info("Using global config only");
    return globalConfig;
  }

  for (const countryCode of countryCandidates) {
    try {
      const countryConfig = await loadResolvedConfig(
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
