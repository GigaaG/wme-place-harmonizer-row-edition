import { logger } from "../../logging/logger";

const FEATURE_EDITOR_SELECTORS = [
  "#edit-panel > div > div > div > wz-section-header",
  "#edit-panel wz-section-header"
];

let featureEditorObserverRegistered = false;
let featureEditorAnchor: Element | null = null;
let featureEditorNotifyTimer: number | null = null;
let featureEditorObserver: MutationObserver | null = null;

function findFeatureEditorAnchor(): Element | null {
  for (const selector of FEATURE_EDITOR_SELECTORS) {
    const match = document.querySelector(selector);

    if (match) {
      return match;
    }
  }

  return null;
}

function scheduleFeatureEditorCallback(callback: () => void): void {
  if (featureEditorNotifyTimer !== null) {
    return;
  }

  featureEditorNotifyTimer = window.setTimeout(() => {
    featureEditorNotifyTimer = null;

    const anchor = findFeatureEditorAnchor();

    if (!anchor) {
      return;
    }

    featureEditorAnchor = anchor;
    logger.info("Feature editor DOM detected");
    callback();
  }, 0);
}

function handleFeatureEditorDomChange(callback: () => void): void {
  const anchor = findFeatureEditorAnchor();

  if (!anchor) {
    featureEditorAnchor = null;
    return;
  }

  if (anchor !== featureEditorAnchor) {
    scheduleFeatureEditorCallback(callback);
  }
}

export function onFeatureEditorOpened(callback: () => void): void {
  if (typeof document === "undefined" || !document.body) {
    logger.warn("Document body not available when registering feature editor observer");
    return;
  }

  if (featureEditorObserverRegistered) {
    handleFeatureEditorDomChange(callback);
    return;
  }

  featureEditorObserver = new MutationObserver(() => {
    handleFeatureEditorDomChange(callback);
  });

  featureEditorObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  featureEditorObserverRegistered = true;
  logger.info("Feature editor observer registered");

  handleFeatureEditorDomChange(callback);
}
