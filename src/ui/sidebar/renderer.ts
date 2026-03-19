import type { SidebarDebugState } from "../../app/app-state";
import { ensureScriptSidebarTab } from "./script-tab";
import { t } from "../../i18n/runtime.ts";

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
        ${escapeHtml(t("app.name"))}
      </div>
  `;

  html += `
      <div style="margin-bottom:8px;">
        <b>${escapeHtml(t("sidebar.channel"))}</b><br>
        ${escapeHtml(state.dataChannel)}
      </div>
  `;

  html += `
      <div style="margin-bottom:8px;">
        <b>${escapeHtml(t("sidebar.manifest"))}</b><br>
        ${escapeHtml(state.manifestVersion)}<br>
        <span style="font-size:12px;color:#666;">${escapeHtml(state.manifestRevision)}</span>
      </div>
  `;

  html += `
      <div style="margin-bottom:8px;">
        <b>${escapeHtml(t("sidebar.runtimeConfig"))}</b><br>
        ${escapeHtml(state.runtimeConfigId)} v${escapeHtml(state.runtimeConfigVersion)}
      </div>
  `;

  html += `
      <div style="margin-bottom:8px;">
        <b>${escapeHtml(t("sidebar.chains"))}</b><br>
        ${escapeHtml(state.runtimeChainsId)} (${escapeHtml(state.runtimeChainsCount)})
      </div>
  `;

  html += `
      <div style="margin-bottom:8px;">
        <b>${escapeHtml(t("sidebar.status"))}</b><br>
        ${escapeHtml(state.lastStatus ?? t("status.ready"))}
      </div>
  `;

  if (state.lastScanSummary) {
    html += `
      <div style="margin-bottom:8px;">
        <b>${escapeHtml(t("sidebar.lastScan"))}</b><br>
        ${escapeHtml(t("sidebar.lastScan.total"))}: ${escapeHtml(state.lastScanSummary.total)}<br>
        ${escapeHtml(t("sidebar.lastScan.ok"))}: ${escapeHtml(state.lastScanSummary.ok)}<br>
        ${escapeHtml(t("sidebar.lastScan.warning"))}: ${escapeHtml(state.lastScanSummary.warning)}<br>
        ${escapeHtml(t("sidebar.lastScan.error"))}: ${escapeHtml(state.lastScanSummary.error)}
      </div>
    `;
  }

  html += `
    <div style="margin-bottom:8px;">
      <b>${escapeHtml(t("sidebar.highlights"))}</b><br>
      ${escapeHtml(state.highlightsEnabled ? t("common.enabled") : t("common.disabled"))}
    </div>
  `;

  html += `
    <div style="margin-bottom:8px;">
      <b>${escapeHtml(t("sidebar.autoScan"))}</b><br>
      <label style="font-size:12px;">
        <input
          id="wmeph-row-auto-scan-toggle"
          type="checkbox"
          ${state.autoScanVisibleVenues ? "checked" : ""}
        />
        ${escapeHtml(t("sidebar.autoScan.label"))}
      </label>
    </div>
  `;

  html += `
    <div style="margin-top:10px;">
      <button id="wmeph-row-reload-data" type="button">
        ${escapeHtml(t("sidebar.reloadData"))}
      </button>
    </div>

    <div style="margin-top:8px;">
      <button id="wmeph-row-scan-visible" type="button">
        ${escapeHtml(t("sidebar.scanVisibleVenues"))}
      </button>
    </div>
  `;

  panel.innerHTML = html;
}
