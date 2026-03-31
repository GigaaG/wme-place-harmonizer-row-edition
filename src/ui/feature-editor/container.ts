import { logger } from "../../logging/logger.ts";

const CONTAINER_ID = "wmeph-row-feature-editor";

let retryTimer: number | null = null;

function findAnchor(): Element | null {
  return (
    document.querySelector("#edit-panel > div > div > div > wz-section-header") ??
    document.querySelector("#edit-panel wz-section-header")
  );
}

export function ensureFeatureEditorContainer(): HTMLElement | null {
  let container = document.getElementById(CONTAINER_ID);

  if (container) {
    return container;
  }

  const anchor = findAnchor();

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
  attempts = 10,
  delayMs = 200
): void {
  cancelFeatureEditorContainerRetry();

  let remaining = attempts;

  const tryMount = (): void => {
    if (!shouldContinue()) {
      logger.info("Feature editor mount retry cancelled because state is no longer valid");
      return;
    }

    const container = ensureFeatureEditorContainer();

    if (container) {
      retryTimer = null;
      return;
    }

    remaining -= 1;

    if (remaining <= 0) {
      logger.warn("Feature editor container could not be mounted after retries");
      retryTimer = null;
      return;
    }

    retryTimer = window.setTimeout(tryMount, delayMs);
  };

  tryMount();
}

export function cancelFeatureEditorContainerRetry(): void {
  if (retryTimer !== null) {
    window.clearTimeout(retryTimer);
    retryTimer = null;
  }
}

export function removeFeatureEditorContainer(): void {
  cancelFeatureEditorContainerRetry();

  const container = document.getElementById(CONTAINER_ID);

  if (container) {
    container.remove();
    logger.info("Feature editor harmonizer container removed");
  }
}
