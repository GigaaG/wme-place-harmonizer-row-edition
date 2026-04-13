import { logger } from "../../logging/logger";
import { findFeatureEditorAnchor } from "../../ui/feature-editor/container.ts";
import { getWmeSdk } from "./wme.ts";

let featureEditorSdkListenerRegistered = false;
const featureEditorOpenedCallbacks = new Set<() => void>();

function runFeatureEditorCallback(callback: () => void): void {
  try {
    callback();
  } catch {
    logger.error("Feature editor opened callback failed");
  }
}

function scheduleFeatureEditorCallback(callback: () => void): void {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(() => runFeatureEditorCallback(callback));
    return;
  }

  if (typeof globalThis.setTimeout === "function") {
    globalThis.setTimeout(() => runFeatureEditorCallback(callback), 0);
    return;
  }

  runFeatureEditorCallback(callback);
}

function notifyFeatureEditorOpened(): void {
  for (const callback of featureEditorOpenedCallbacks) {
    scheduleFeatureEditorCallback(callback);
  }
}

function registerFeatureEditorSdkListener(): boolean {
  if (featureEditorSdkListenerRegistered) {
    return true;
  }

  const sdk = getWmeSdk();

  if (!sdk?.Events?.on) {
    logger.warn("Feature editor SDK listener could not be registered");
    return false;
  }

  try {
    sdk.Events.on({
      eventName: "wme-feature-editor-opened",
      eventHandler: () => {
        logger.info("Feature editor opened via SDK event");
        notifyFeatureEditorOpened();
      }
    });
  } catch {
    logger.warn("Feature editor SDK listener registration failed");
    return false;
  }

  featureEditorSdkListenerRegistered = true;
  logger.info("Feature editor SDK listener registered");
  return true;
}

export function onFeatureEditorOpened(callback: () => void): void {
  if (typeof document === "undefined" || !document.body) {
    logger.warn("Document body not available when registering feature editor listener");
    return;
  }

  featureEditorOpenedCallbacks.add(callback);
  if (!registerFeatureEditorSdkListener()) {
    return;
  }

  if (findFeatureEditorAnchor()) {
    scheduleFeatureEditorCallback(callback);
  }
}
