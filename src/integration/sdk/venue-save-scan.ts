import { logger } from "../../logging/logger.ts";
import { getWmeSdk } from "./wme.ts";

const TRACKED_DATA_MODEL_NAME = "venues";
const SAVE_SCAN_DEBOUNCE_MS = 300;

let listenersRegistered = false;
let debounceTimer: number | null = null;

export interface SavedDataModelObjectsEvent {
  dataModelName?: string;
  objectIds?: Array<string | number> | null;
}

export function getSavedVenueIds(
  event: SavedDataModelObjectsEvent | null | undefined
): string[] {
  if (
    event?.dataModelName !== TRACKED_DATA_MODEL_NAME ||
    !Array.isArray(event.objectIds)
  ) {
    return [];
  }

  return [...new Set(event.objectIds.map((objectId) => String(objectId)).filter(Boolean))];
}

function debounce(fn: () => void, delayMs: number): void {
  if (debounceTimer !== null) {
    globalThis.clearTimeout(debounceTimer);
  }

  debounceTimer = globalThis.setTimeout(() => {
    debounceTimer = null;
    fn();
  }, delayMs);
}

export function registerVenueSaveScanListener(
  scanHandler: () => Promise<void>
): void {
  if (listenersRegistered) {
    return;
  }

  const sdk = getWmeSdk();

  if (!sdk) {
    logger.warn("Cannot register venue save scan listener: SDK unavailable");
    return;
  }

  if (typeof sdk.Events?.trackDataModelEvents !== "function") {
    logger.warn("Cannot register venue save scan listener: SDK data model tracking unavailable");
    return;
  }

  sdk.Events.trackDataModelEvents({
    dataModelName: TRACKED_DATA_MODEL_NAME
  });

  sdk.Events.on({
    eventName: "wme-data-model-objects-saved",
    eventHandler: (event: SavedDataModelObjectsEvent) => {
      const savedVenueIds = getSavedVenueIds(event);

      if (savedVenueIds.length === 0) {
        return;
      }

      logger.info(
        `Detected saved venue edit(s): ${savedVenueIds.join(", ")}; rescanning visible venues`
      );

      debounce(() => {
        void scanHandler();
      }, SAVE_SCAN_DEBOUNCE_MS);
    }
  });

  listenersRegistered = true;
  logger.info("Venue save scan listener registered");
}

export function resetVenueSaveScanListenerForTests(): void {
  listenersRegistered = false;

  if (debounceTimer !== null) {
    globalThis.clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}
