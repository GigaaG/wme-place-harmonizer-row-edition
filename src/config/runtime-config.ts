import { logger } from "../logging/logger.ts";
import { loadConfigFile } from "./config-loader.ts";
import { mergeConfigs } from "./config-merger.ts";
import type { HarmonizerConfig } from "../types/config.ts";
import { getCountryCodeCandidates } from "./country-code.ts";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown config loading error";
}

function resolveConfigExtendsPath(extendsId: string): string {
  const normalizedExtendsId = extendsId.trim();

  if (normalizedExtendsId === "global") {
    return "config/global.json";
  }

  if (normalizedExtendsId.startsWith("community:")) {
    return `config/communities/${normalizedExtendsId.slice("community:".length)}.json`;
  }

  if (normalizedExtendsId.startsWith("country:")) {
    return `config/countries/${normalizedExtendsId.slice("country:".length)}.json`;
  }

  if (normalizedExtendsId.startsWith("state:")) {
    return `config/states/${normalizedExtendsId.slice("state:".length)}.json`;
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
    } catch (error) {
      logger.warn(
        `Country config ${countryCode} could not be loaded: ${getErrorMessage(error)}`
      );
    }
  }

  logger.warn(
    `No valid country config found for ${countryCandidates.join(", ")}; using global`
  );

  return globalConfig;
}
