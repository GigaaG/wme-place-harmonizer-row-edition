import { logger } from "../../logging/logger";
import { getWmeSdk } from "../../integration/sdk/wme";

const SCRIPT_TAB_ID = "wmeph-row-script-tab";
const SCRIPT_TAB_TITLE = "Place Harmonizer";

let registeredTabPane: HTMLElement | null = null;

export async function ensureScriptSidebarTab(): Promise<HTMLElement | null> {
  if (registeredTabPane && document.contains(registeredTabPane)) {
    return registeredTabPane;
  }

  const sdk = getWmeSdk();

  if (!sdk?.Sidebar?.registerScriptTab) {
    logger.warn("SDK Sidebar.registerScriptTab is not available");
    return null;
  }

  try {
    const result = await sdk.Sidebar.registerScriptTab({
      scriptId: SCRIPT_TAB_ID
    });

    result.tabLabel.textContent = "PH";
    result.tabLabel.title = SCRIPT_TAB_TITLE;

    registeredTabPane = result.tabPane;
    registeredTabPane.innerHTML = "";

    logger.info("SDK script sidebar tab registered");

    return registeredTabPane;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown sidebar tab registration error";

    logger.warn(`Failed to register script sidebar tab: ${message}`);

    return null;
  }
}

export function removeScriptSidebarTab(): void {
  const sdk = getWmeSdk();

  if (!sdk?.Sidebar?.removeScriptTab) {
    return;
  }

  try {
    sdk.Sidebar.removeScriptTab({
      scriptId: SCRIPT_TAB_ID
    });
    registeredTabPane = null;
    logger.info("SDK script sidebar tab removed");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown sidebar tab removal error";

    logger.warn(`Failed to remove script sidebar tab: ${message}`);
  }
}