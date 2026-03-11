import type { PlaceIssue } from "../../types/issue";
import { ensureFeatureEditorContainer } from "./container";
import type { PlaceProposal } from "../../types/proposal";

function findProposalForIssue(
  issue: PlaceIssue,
  proposals: PlaceProposal[]
): PlaceProposal | undefined {

  return proposals.find(
    (proposal) =>
      proposal.field === issue.field &&
      proposal.issueRuleId === issue.ruleId
  );

}

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

function renderIssue(
  issue: PlaceIssue,
  proposals: PlaceProposal[]
): string {

  const proposal = findProposalForIssue(issue, proposals);

  let html = "";

  html += `
    <div style="
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 8px;
      margin-top: 8px;
      background: #fff;
    ">
  `;

  html += `
    <div style="font-weight:600; margin-bottom:4px;">
      ${getSeverityIcon(issue.severity)} ${escapeHtml(issue.message)}
    </div>
  `;

  if (issue.field) {

    html += `
      <div style="font-size:12px;color:#666;margin-bottom:4px;">
        Field: ${escapeHtml(issue.field)}
      </div>
    `;

  }

  if (proposal) {

    html += `
      <div style="font-size:12px;margin-top:4px;">
        <b>Current:</b> ${escapeHtml(JSON.stringify(proposal.currentValue))}
      </div>
    `;

    html += `
      <div style="font-size:12px;">
        <b>Suggested:</b> ${escapeHtml(JSON.stringify(proposal.proposedValue))}
      </div>
    `;

  }

  html += `</div>`;

  return html;
}

export function renderFeatureEditorAnalysis(
  placeName: string,
  chainId: string | null,
  issues: PlaceIssue[],
  proposals: PlaceProposal[]
): void {
  const container = ensureFeatureEditorContainer();

  if (!container) {
    return;
  }

  let html = "";

  html += `
  <div style="
    display:flex;
    flex-direction:column;
    max-height:300px;
  ">

  <div style="
    font-weight:600;
    margin-bottom:8px;
  ">
    Place Harmonizer
  </div>

  <div style="
    overflow-y:auto;
    max-height:260px;
    padding-right:4px;
  ">
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
      html += renderIssue(issue, proposals);
    }
  }
  
  container.innerHTML = html;
  html += `
  </div>
  </div>
  `;
}