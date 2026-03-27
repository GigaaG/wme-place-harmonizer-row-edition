import { logger } from "../logging/logger.ts";
import { loadChainFile } from "./chain-loader.ts";
import { mergeChainDatasets } from "./chain-merger.ts";
import type { ChainDataset } from "../types/chains.ts";
import { getCountryCodeCandidates } from "./country-code.ts";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown chain loading error";
}

export async function resolveRuntimeChains(country?: string): Promise<ChainDataset> {
  const countryCandidates = getCountryCodeCandidates(country);
  const globalChains = await loadChainFile("chains/global.json");

  if (countryCandidates.length === 0) {
    logger.info(`Using global chains only (country input: ${country ?? "none"})`);
    return globalChains;
  }

  for (const countryCode of countryCandidates) {
    try {
      const countryChains = await loadChainFile(`chains/countries/${countryCode}.json`);

      logger.info(`Applying country chains: ${countryCode}`);

      return mergeChainDatasets(globalChains, countryChains);
    } catch (error) {
      logger.warn(
        `Country chain dataset ${countryCode} could not be loaded: ${getErrorMessage(error)}`
      );
    }
  }

  logger.warn(
    `No valid country chain dataset found for ${countryCandidates.join(", ")}; using global chains`
  );
  return globalChains;
}
