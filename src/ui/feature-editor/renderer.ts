import type { PlaceIssue } from "../../types/issue";
import { ensureFeatureEditorContainer } from "./container";

function getIcon(severity: string): string {

  if (severity === "error") {
    return "❌";
  }

  if (severity === "warning") {
    return "⚠";
  }

  return "ℹ";
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

  html += `<div style="font-weight:600;margin-bottom:6px;">Place Harmonizer</div>`;

  html += `<div><b>Place</b><br>${placeName}</div><br>`;

  html += `<div><b>Chain</b><br>${chainId ?? "None"}</div><br>`;

  html += `<div><b>Issues</b></div>`;

  if (issues.length === 0) {

    html += `<div style="color:green">No issues found</div>`;

  } else {

    html += `<ul style="margin-top:4px;padding-left:18px;">`;

    for (const issue of issues) {

      html += `
        <li>
          ${getIcon(issue.severity)} ${issue.message}
        </li>
      `;
    }

    html += `</ul>`;
  }

  container.innerHTML = html;
}