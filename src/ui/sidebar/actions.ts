import { getSidebarDebugState } from "../../app/app-state";
import { renderSidebarDebugPanel } from "./renderer";

export function wireSidebarPanelActions(): void {
  const button = document.getElementById("wmeph-row-sidebar-refresh");

  if (!button) {
    return;
  }

  button.onclick = async () => {
    const state = getSidebarDebugState();

    if (!state) {
      return;
    }

    await renderSidebarDebugPanel(state);
  };
}

export function wireSidebarReloadButton(
  reloadHandler: () => Promise<void>
) {

  const button = document.getElementById("wmeph-row-reload-data");

  if (!button) {
    return;
  }

  button.onclick = async () => {
    button.setAttribute("disabled", "true");

    try {
      await reloadHandler();
    } finally {
      button.removeAttribute("disabled");
    }
  };
}

export function wireSidebarScanButton(
  scanHandler: () => Promise<void>
): void {
  const button = document.getElementById("wmeph-row-scan-visible");

  if (!button) {
    return;
  }

  button.onclick = async () => {
    button.setAttribute("disabled", "true");

    try {
      await scanHandler();
    } finally {
      button.removeAttribute("disabled");
    }
  };
}

export function wireSidebarAutoScanToggle(
  currentValue: boolean,
  changeHandler: (nextValue: boolean) => Promise<void> | void
): void {
  const checkbox = document.getElementById(
    "wmeph-row-auto-scan-toggle"
  ) as HTMLInputElement | null;

  if (!checkbox) {
    return;
  }

  checkbox.checked = currentValue;

  checkbox.onchange = async () => {
    await changeHandler(checkbox.checked);
  };
}