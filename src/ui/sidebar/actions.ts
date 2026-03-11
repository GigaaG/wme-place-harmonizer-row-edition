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