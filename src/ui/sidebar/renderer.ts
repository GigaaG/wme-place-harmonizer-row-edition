import type { SidebarDebugState } from "../../app/app-state";
import { ensureScriptSidebarTab } from "./script-tab";

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function renderSidebarDebugPanel(
  state: SidebarDebugState
): Promise<void> {
  const panel = await ensureScriptSidebarTab();

  if (!panel) {
    return;
  }

  let html = "";

  html += `
    <div style="padding:10px;font-size:13px;line-height:1.4;">
      <div style="font-weight:600; margin-bottom:8px;">
        WME Place Harmonizer ROW
      </div>
  `;

  html += `
      <div style="margin-bottom:8px;">
        <b>Channel</b><br>
        ${escapeHtml(state.dataChannel)}
      </div>
  `;

  html += `
      <div style="margin-bottom:8px;">
        <b>Manifest</b><br>
        ${escapeHtml(state.manifestVersion)}<br>
        <span style="font-size:12px;color:#666;">${escapeHtml(state.manifestRevision)}</span>
      </div>
  `;

  html += `
      <div style="margin-bottom:8px;">
        <b>Runtime Config</b><br>
        ${escapeHtml(state.runtimeConfigId)} v${escapeHtml(state.runtimeConfigVersion)}
      </div>
  `;

  html += `
      <div style="margin-bottom:8px;">
        <b>Chains</b><br>
        ${escapeHtml(state.runtimeChainsId)} (${escapeHtml(state.runtimeChainsCount)})
      </div>
  `;

  html += `
      <div style="margin-bottom:8px;">
        <b>Status</b><br>
        ${escapeHtml(state.lastStatus ?? "Ready")}
      </div>
  `;

  html += `
      <div style="margin-top:10px;">
        <button id="wmeph-row-sidebar-refresh" type="button">
          Refresh panel
        </button>
      </div>
    </div>
  `;

  panel.innerHTML = html;
}