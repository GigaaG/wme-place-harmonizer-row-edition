import { logger } from "../logging/logger";

export function bootstrap(): void {
  logger.info("Bootstrapping WME Place Harmonizer ROW Edition");

  if (!isSupportedEnvironment()) {
    logger.warn("Unsupported environment detected. Script will not continue.");
    return;
  }

  logger.info("Environment looks valid. Initialization skeleton is ready.");
}

function isSupportedEnvironment(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}