import { logger } from "../logging/logger";
import { loadChainFile } from "./chain-loader";
import { mergeChainDatasets } from "./chain-merger";
import type { ChainDataset } from "../types/chains";

export async function resolveRuntimeChains(country?: string): Promise<ChainDataset> {
  const globalChains = await loadChainFile("chains/global.json");

  if (!country) {
    logger.info("Using global chains only");
    return globalChains;
  }

  try {
    const countryChains = await loadChainFile(`chains/countries/${country}.json`);

    logger.info(`Applying country chains: ${country}`);

    return mergeChainDatasets(globalChains, countryChains);
  } catch {
    logger.warn(`Country chain dataset not found for ${country}, using global chains`);
    return globalChains;
  }
}