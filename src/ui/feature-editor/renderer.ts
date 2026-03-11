import type { PlaceIssue } from "../../types/issue";
import { ensureFeatureEditorContainer } from "./container";

function getSeverityIcon(severity: string): string {
  if (severity === "error") {
    return "❌";
  }

  if (severity === "warning") {
    return "⚠️";
  }

  return "ℹ️";
}

function getSeverityLabel(severity: string): string {
  if (severity === "error") {
    return "Error";
  }

  if (severity === "warning") {
    return "Warning";
  }

  return "Info";
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderIssue(issue: PlaceIssue): string {
  let html = "";

  html += `
    <div style="
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 8px;
      margin-top: 8px;
      background: #fff;
    ">
      <div style="font-weight:600; margin-bottom:4px;">
        ${getSeverityIcon(issue.severity)} ${escapeHtml(getSeverityLabel(issue.severity))}
      </div>
      <div style="margin-bottom:4px;">
        ${escapeHtml(issue.message)}
      </div>
  `;

  if (issue.field) {
    html += `
      <div style="font-size:12px; color:#666; margin-bottom:4px;">
        Field: ${escapeHtml(issue.field)}
      </div>
    `;
  }

  if (issue.currentValue !== undefined) {
    html += `
      <div style="font-size:12px; margin-bottom:2px;">
        <b>Current:</b> ${escapeHtml(JSON.stringify(issue.currentValue))}
      </div>
    `;
  }

  if (issue.expectedValue !== undefined) {
    html += `
      <div style="font-size:12px; margin-bottom:2px;">
        <b>Expected:</b> ${escapeHtml(JSON.stringify(issue.expectedValue))}
      </div>
    `;
  }

  if (issue.ruleId) {
    html += `
      <div style="font-size:12px; color:#888; margin-top:4px;">
        Rule: ${escapeHtml(issue.ruleId)}
      </div>
    `;
  }

  html += `</div>`;

  return html;
}

export function renderFeatureEditorAnalysis(
  placeName: string,
  chainId: string | null,
  issues: PlaceIssue[]
): void {
  const container = ensureFeatureEditorContainer();

  if (!container) {
    return;
  }

  let html = "";

  html += `
    <div style="font-weight:600; margin-bottom:8px;">
      Place Harmonizer
    </div>
  `;

  html += `
    <div style="margin-bottom:8px;">
      <div><b>Place</b></div>
      <div>${escapeHtml(placeName)}</div>
    </div>
  `;

  html += `
    <div style="margin-bottom:8px;">
      <div><b>Chain</b></div>
      <div>${escapeHtml(chainId ?? "None")}</div>
    </div>
  `;

  html += `
    <div style="margin-bottom:8px;">
      <div><b>Issues</b></div>
      <div>${issues.length}</div>
    </div>
  `;

  if (issues.length === 0) {
    html += `
      <div style="
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 8px;
        background: #fff;
        color: green;
      ">
        No issues found
      </div>
    `;
  } else {
    for (const issue of issues) {
      html += renderIssue(issue);
    }
  }

  container.innerHTML = html;
}