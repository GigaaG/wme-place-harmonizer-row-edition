import { logger } from "../logging/logger";
import { fetchJson } from "../network/fetch-json";
import type { HarmonizerConfig } from "../types/config";
import { getConfigUrl } from "./config-source";

export async function loadConfigFile(path: string): Promise<HarmonizerConfig> {
  const url = getConfigUrl(path);

  logger.info(`Loading config ${path}`);

  const result = await fetchJson<unknown>(url);

  if (!result || typeof result !== "object") {
    throw new Error(`Invalid config file: ${path}`);
  }

  return result as HarmonizerConfig;
}