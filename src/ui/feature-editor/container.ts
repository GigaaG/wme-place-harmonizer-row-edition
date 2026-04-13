import { logger } from "../../logging/logger.ts";

const CONTAINER_ID = "wmeph-row-feature-editor";
const FEATURE_EDITOR_SELECTORS = [
  "#edit-panel > div > div > div > wz-section-header",
  "#edit-panel wz-section-header"
];

export function findFeatureEditorAnchor(): Element | null {
  for (const selector of FEATURE_EDITOR_SELECTORS) {
    const match = document.querySelector(selector);

    if (match) {
      return match;
    }
  }

  return null;
}

export function getFeatureEditorContainer(): HTMLElement | null {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") {
    return null;
  }

  return document.getElementById(CONTAINER_ID);
}

export function ensureFeatureEditorContainer(): HTMLElement | null {
  let container = getFeatureEditorContainer();

  if (container) {
    return container;
  }

  const anchor = findFeatureEditorAnchor();

  if (!anchor) {
    logger.warn("Feature editor header not found");
    return null;
  }

  container = document.createElement("div");
  container.id = CONTAINER_ID;
  container.style.padding = "8px";
  container.style.borderBottom = "1px solid #ddd";
  container.style.marginBottom = "8px";

  anchor.parentElement?.insertBefore(container, anchor.nextSibling);

  logger.info("Feature editor harmonizer container mounted");

  return container;
}

export function retryEnsureFeatureEditorContainer(
  shouldContinue: () => boolean,
  _attempts = 10,
  _delayMs = 200
): void {
  if (!shouldContinue()) {
    logger.info("Feature editor mount skipped because state is no longer valid");
    return;
  }

  ensureFeatureEditorContainer();
}

export function cancelFeatureEditorContainerRetry(): void {}

export function removeFeatureEditorContainer(): void {
  const container = getFeatureEditorContainer();

  if (container) {
    container.remove();
    logger.info("Feature editor harmonizer container removed");
  }
}
