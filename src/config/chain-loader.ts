import { logger } from "../logging/logger";
import { fetchJson } from "../network/fetch-json";
import { getConfigUrl } from "./config-source";
import type { ChainDataset } from "../types/chains";

function isValidChainDataset(value: unknown): value is ChainDataset {
  if (!value || typeof value !== "object") {
    return false;
  }

  const dataset = value as Partial<ChainDataset>;

  return (
    dataset.type === "chain-dataset" &&
    typeof dataset.id === "string" &&
    typeof dataset.version === "number" &&
    Array.isArray(dataset.items)
  );
}

export async function loadChainFile(path: string): Promise<ChainDataset> {
  const url = getConfigUrl(path);

  logger.info(`Loading chains ${path}`);

  const result = await fetchJson<unknown>(url);

  if (!isValidChainDataset(result)) {
    throw new Error(`Invalid chain dataset: ${path}`);
  }

  logger.info(
    `Loaded chain dataset ${result.id} v${result.version} with ${result.items.length} items`
  );

  return result;
}