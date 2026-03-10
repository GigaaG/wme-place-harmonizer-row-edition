import { logger } from "../logging/logger";
import { isSupportedEnvironment } from "./guards";
import { startApplication } from "../app/start";

export function bootstrap(): void {
  logger.info("Bootstrapping WME Place Harmonizer ROW Edition");

  if (!isSupportedEnvironment()) {
    logger.warn("Unsupported environment detected. Script will not continue.");
    return;
  }

  startApplication();
}