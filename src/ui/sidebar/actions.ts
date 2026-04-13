import { getSidebarDebugState } from "../../app/app-state";
import { renderSidebarDebugPanel } from "./renderer";
import { getScriptSidebarTabPane } from "./script-tab.ts";
import {
  GOOGLE_MAPS_VALIDATION_CHECK_KEYS,
  type GoogleMapsValidationCheckKey,
  type GoogleMapsValidationChecks
} from "../../types/settings";

type AsyncSidebarAction = (() => Promise<void> | void) | null;
type BooleanChangeHandler = ((nextValue: boolean) => Promise<void> | void) | null;
type GoogleMapsValidationCheckChangeHandler = (
  checkKey: GoogleMapsValidationCheckKey,
  nextValue: boolean
) => Promise<void> | void;

let sidebarPaneWithListeners: HTMLElement | null = null;
let sidebarPaneListenersAttached = false;

let refreshSidebarHandler: AsyncSidebarAction = null;
let reloadSidebarHandler: AsyncSidebarAction = null;
let scanSidebarHandler: AsyncSidebarAction = null;
let autoScanChangeHandler: BooleanChangeHandler = null;
let naturalFeaturesHighlightChangeHandler: BooleanChangeHandler = null;
let googleMapsValidationToggleChangeHandler: BooleanChangeHandler = null;
let googleMapsValidationChecksChangeHandler: GoogleMapsValidationCheckChangeHandler | null =
  null;

function getSidebarPane(): HTMLElement | null {
  const pane = getScriptSidebarTabPane();

  if (!pane) {
    return null;
  }

  if (pane !== sidebarPaneWithListeners) {
    sidebarPaneWithListeners = pane;
    sidebarPaneListenersAttached = false;
  }

  if (!sidebarPaneListenersAttached) {
    pane.addEventListener("click", handleSidebarPaneClick);
    pane.addEventListener("change", handleSidebarPaneChange);
    sidebarPaneListenersAttached = true;
  }

  return pane;
}

function getEventTarget(event: Event): HTMLElement | null {
  return event.target instanceof HTMLElement ? event.target : null;
}

function runButtonAction(
  button: HTMLButtonElement,
  handler: AsyncSidebarAction
): void {
  if (!handler || button.disabled) {
    return;
  }

  button.disabled = true;

  void (async () => {
    try {
      await handler();
    } finally {
      button.disabled = false;
    }
  })();
}

function handleSidebarPaneClick(event: Event): void {
  const target = getEventTarget(event);

  if (!target) {
    return;
  }

  const refreshButton = target.closest("#wmeph-row-sidebar-refresh") as
    | HTMLButtonElement
    | null;
  if (refreshButton) {
    runButtonAction(refreshButton, refreshSidebarHandler);
    return;
  }

  const reloadButton = target.closest("#wmeph-row-reload-data") as
    | HTMLButtonElement
    | null;
  if (reloadButton) {
    runButtonAction(reloadButton, reloadSidebarHandler);
    return;
  }

  const scanButton = target.closest("#wmeph-row-scan-visible") as
    | HTMLButtonElement
    | null;
  if (scanButton) {
    runButtonAction(scanButton, scanSidebarHandler);
  }
}

function handleSidebarPaneChange(event: Event): void {
  const target = getEventTarget(event);

  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (target.id === "wmeph-row-auto-scan-toggle") {
    void autoScanChangeHandler?.(target.checked);
    return;
  }

  if (target.id === "wmeph-row-natural-features-highlight-toggle") {
    void naturalFeaturesHighlightChangeHandler?.(target.checked);
    return;
  }

  if (target.id === "wmeph-row-google-validation-toggle") {
    void googleMapsValidationToggleChangeHandler?.(target.checked);
    return;
  }

  const googleValidationPrefix = "wmeph-row-google-validation-";

  if (target.id.startsWith(googleValidationPrefix)) {
    const checkKey = target.id.slice(
      googleValidationPrefix.length
    ) as GoogleMapsValidationCheckKey;

    void googleMapsValidationChecksChangeHandler?.(checkKey, target.checked);
  }
}

function syncCheckboxValue(selector: string, currentValue: boolean): void {
  const pane = getSidebarPane();

  if (!pane) {
    return;
  }

  const checkbox = pane.querySelector<HTMLInputElement>(selector);

  if (!checkbox) {
    return;
  }

  checkbox.checked = currentValue;
}

function syncGoogleMapsValidationCheckValues(
  currentValue: GoogleMapsValidationChecks
): void {
  const pane = getSidebarPane();

  if (!pane) {
    return;
  }

  for (const checkKey of GOOGLE_MAPS_VALIDATION_CHECK_KEYS) {
    const checkbox = pane.querySelector<HTMLInputElement>(
      `#wmeph-row-google-validation-${checkKey}`
    );

    if (!checkbox) {
      continue;
    }

    checkbox.checked = currentValue[checkKey];
  }
}

export function wireSidebarPanelActions(): void {
  refreshSidebarHandler = async () => {
    const state = getSidebarDebugState();

    if (!state) {
      return;
    }

    await renderSidebarDebugPanel(state);
  };

  getSidebarPane();
}

export function wireSidebarReloadButton(
  reloadHandler: () => Promise<void>
): void {
  reloadSidebarHandler = reloadHandler;

  getSidebarPane();
}

export function wireSidebarScanButton(
  scanHandler: () => Promise<void>
): void {
  scanSidebarHandler = scanHandler;

  getSidebarPane();
}

export function wireSidebarAutoScanToggle(
  currentValue: boolean,
  changeHandler: (nextValue: boolean) => Promise<void> | void
): void {
  autoScanChangeHandler = changeHandler;
  syncCheckboxValue("#wmeph-row-auto-scan-toggle", currentValue);
}

export function wireSidebarNaturalFeaturesHighlightToggle(
  currentValue: boolean,
  changeHandler: (nextValue: boolean) => Promise<void> | void
): void {
  naturalFeaturesHighlightChangeHandler = changeHandler;
  syncCheckboxValue("#wmeph-row-natural-features-highlight-toggle", currentValue);
}

export function wireSidebarGoogleMapsValidationToggle(
  currentValue: boolean,
  changeHandler: (nextValue: boolean) => Promise<void> | void
): void {
  googleMapsValidationToggleChangeHandler = changeHandler;
  syncCheckboxValue("#wmeph-row-google-validation-toggle", currentValue);
}

export function wireSidebarGoogleMapsValidationChecks(
  currentValue: GoogleMapsValidationChecks,
  changeHandler: (
    checkKey: GoogleMapsValidationCheckKey,
    nextValue: boolean
  ) => Promise<void> | void
): void {
  googleMapsValidationChecksChangeHandler = changeHandler;
  syncGoogleMapsValidationCheckValues(currentValue);
}
