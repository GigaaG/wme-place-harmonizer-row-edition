import type { SidebarDebugState } from "../../app/app-state";
import { ensureScriptSidebarTab } from "./script-tab.ts";
import { t } from "../../i18n/runtime.ts";
import { GOOGLE_MAPS_VALIDATION_CHECK_KEYS } from "../../types/settings.ts";

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildDebugInfoLines(state: SidebarDebugState): string[] {
  return [
    `${t("sidebar.channel")}: ${state.dataChannel}`,
    `${t("sidebar.manifest")}: ${state.manifestVersion} / ${state.manifestRevision}`,
    `${t("sidebar.runtimeConfig")}: ${state.runtimeConfigId} v${state.runtimeConfigVersion}`,
    `${t("sidebar.chains")}: ${state.runtimeChainsId} (${state.runtimeChainsCount})`
  ];
}

export async function renderSidebarDebugPanel(
  state: SidebarDebugState
): Promise<void> {
  const panel = await ensureScriptSidebarTab();

  if (!panel) {
    return;
  }

  let html = "";
  const debugInfoLines = buildDebugInfoLines(state);
  const debugInfoTooltip = escapeHtml(debugInfoLines.join("\n")).replace(
    /\r?\n/g,
    "&#10;"
  );
  const debugInfoAriaLabel = escapeHtml(debugInfoLines.join(". "));

  html += `
    <div style="padding:10px;font-size:13px;line-height:1.4;">
      <div style="display:flex;align-items:center;gap:6px;font-weight:600;margin-bottom:8px;">
        <span>${escapeHtml(t("app.name"))}</span>
        <span
          id="wmeph-row-debug-info"
          tabindex="0"
          title="${debugInfoTooltip}"
          aria-label="${debugInfoAriaLabel}"
          style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border:1px solid #5b7083;border-radius:999px;font-size:11px;font-weight:700;color:#3c4a57;cursor:help;"
        >
          i
        </span>
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

  const googleValidationEnabled =
    state.googleMapsValidation?.enabled ?? true;
  const googleValidationChecks =
    state.googleMapsValidation?.checks;
  const googleValidationAvailability =
    state.googleMapsValidationAvailability;
  const googleValidationAvailable =
    googleValidationAvailability?.enabled ?? true;
  const showGoogleValidationChecks =
    googleValidationAvailable && googleValidationEnabled;

  html += `
    <div style="margin-bottom:8px;">
      <b>${escapeHtml(t("sidebar.googleMapsValidation"))}</b><br>
      <label style="font-size:12px;display:block;margin-top:4px;">
        <input
          id="wmeph-row-google-validation-toggle"
          type="checkbox"
          ${googleValidationEnabled ? "checked" : ""}
          ${googleValidationAvailable ? "" : "disabled"}
        />
        ${escapeHtml(t("sidebar.googleMapsValidation.enabled"))}
      </label>
  `;

  if (showGoogleValidationChecks) {
    html += `
      <div style="font-size:12px;color:#666;margin:6px 0 4px 18px;">
        ${escapeHtml(t("sidebar.googleMapsValidation.checks"))}
      </div>
    `;

    for (const checkKey of GOOGLE_MAPS_VALIDATION_CHECK_KEYS) {
      const isChecked = googleValidationChecks?.[checkKey] ?? true;
      const isAvailable =
        googleValidationAvailability?.checks?.[checkKey] ?? true;
      const textColor = !isAvailable ? "#888" : "#222";

      html += `
        <label style="font-size:12px;display:block;margin-left:18px;color:${textColor};">
          <input
            id="wmeph-row-google-validation-${escapeHtml(checkKey)}"
            type="checkbox"
            ${isChecked ? "checked" : ""}
            ${isAvailable ? "" : "disabled"}
          />
          ${escapeHtml(t(`sidebar.googleMapsValidation.${checkKey}`))}
        </label>
      `;
    }
  }

  html += `
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
