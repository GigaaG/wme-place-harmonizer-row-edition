import { logger } from "../../logging/logger";
import { getWmeSdk } from "./wme";

let listenersRegistered = false;
let debounceTimer: number | null = null;

function debounce(fn: () => void, delayMs: number): void {
  if (debounceTimer !== null) {
    window.clearTimeout(debounceTimer);
  }

  debounceTimer = window.setTimeout(() => {
    debounceTimer = null;
    fn();
  }, delayMs);
}

export function registerAutoScanListeners(
  shouldAutoScan: () => boolean,
  scanHandler: () => Promise<void>
): void {
  if (listenersRegistered) {
    return;
  }

  const sdk = getWmeSdk();

  if (!sdk) {
    logger.warn("Cannot register auto scan listeners: SDK unavailable");
    return;
  }

  const runIfEnabled = (): void => {
    if (!shouldAutoScan()) {
      return;
    }

    debounce(() => {
      void scanHandler();
    }, 300);
  };

  sdk.Events.on({
    eventName: "wme-map-move-end",
    eventHandler: () => {
      logger.info("Map move end detected");
      runIfEnabled();
    }
  });

  sdk.Events.on({
    eventName: "wme-map-zoom-changed",
    eventHandler: () => {
      logger.info("Map zoom changed detected");
      runIfEnabled();
    }
  });

  listenersRegistered = true;
  logger.info("Auto scan listeners registered");
}