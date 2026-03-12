import { logger } from "../logging/logger";
import { loadChainFile } from "./chain-loader";
import { mergeChainDatasets } from "./chain-merger";
import type { ChainDataset } from "../types/chains";
import { getCountryCodeCandidates } from "./country-code";

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
    } catch {
      // Try next candidate
    }
  }

  logger.warn(`Country chain dataset not found for ${countryCandidates.join(", ")}, using global chains`);
  return globalChains;
}
