import { logger } from "../../logging/logger";
import { getWmeSdk } from "./wme";

export function onFeatureEditorOpened(callback: () => void): void {
  const sdk = getWmeSdk();

  if (!sdk) {
    logger.warn("WME SDK not available when registering feature editor listener");
    return;
  }

  sdk.Events.on({
    eventName: "wme-feature-editor-opened",
    eventHandler: () => {
      logger.info("Received wme-feature-editor-opened event");
      callback();
    }
  });

  logger.info("Feature editor listener registered via SDK");
}