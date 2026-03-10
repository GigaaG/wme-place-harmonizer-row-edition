import { APP_NAME } from "../constants/app";
import { logger } from "../logging/logger";
import { settingsManager } from "../settings/manager";
import { getWmeContext } from "../integration/sdk/wme";
import { mountSidebarPlaceholder } from "../integration/sdk/sidebar";

export function startApplication(): void {
  logger.info(`Starting ${APP_NAME}`);

  const settings = settingsManager.load();
  logger.info(`Loaded settings for channel: ${settings.dataChannel}`);

  const wmeContext = getWmeContext();
  if (!wmeContext.isReady) {
    logger.warn("WME context is not ready");
    return;
  }

  mountSidebarPlaceholder();

  logger.info("Application skeleton started successfully");
}