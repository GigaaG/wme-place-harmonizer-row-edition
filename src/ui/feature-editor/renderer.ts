import { ensureFeatureEditorContainer } from "./container";
import type { PlaceIssue } from "../../types/issue";
import type { PlaceProposal } from "../../types/proposal";
import { groupIssuesForFeatureEditor } from "./issue-groups";

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

function formatDisplayValue(value: unknown): string {
  const serialized = JSON.stringify(value);
  return escapeHtml(serialized ?? "missing");
}

function formatProposalValue(
  value: unknown,
  displayValue?: string
): string {
  if (typeof displayValue === "string" && displayValue.trim().length > 0) {
    return escapeHtml(displayValue);
  }

  return formatDisplayValue(value);
}

function formatLinkedProposalValue(
  value: unknown,
  displayValue?: string,
  valueUrl?: string
): string {
  const formattedValue = formatProposalValue(value, displayValue);

  if (typeof valueUrl !== "string" || valueUrl.trim().length === 0) {
    return formattedValue;
  }

  return `
    <a
      href="${escapeHtml(valueUrl)}"
      target="_blank"
      rel="noopener noreferrer"
      style="color:#1a73e8;text-decoration:underline;"
    >
      ${formattedValue}
    </a>
  `;
}

function renderProposal(
  issue: PlaceIssue,
  proposal: PlaceProposal,
  index: number
): string {
  let html = "";

  html += `
    <div style="
      font-size:12px;
      margin-top:6px;
      ${index > 0 ? "padding-top:6px;border-top:1px solid #eee;" : ""}
    ">
  `;

  if (
    proposal.currentValue !== undefined ||
    (proposal.displayCurrentValue ?? "").trim().length > 0
  ) {
    html += `
      <div>
        <b>Current:</b> ${formatProposalValue(
          proposal.currentValue,
          proposal.displayCurrentValue
        )}
      </div>
    `;
  }

  if (
    proposal.proposedValue !== undefined ||
    (proposal.displayProposedValue ?? "").trim().length > 0
  ) {
    html += `
      <div>
        <b>Suggested:</b> ${formatLinkedProposalValue(
          proposal.proposedValue,
          proposal.displayProposedValue,
          proposal.displayProposedValueUrl
        )}
      </div>
    `;
  }

  if (proposal.reason && proposal.reason !== issue.message) {
    html += `
      <div style="color:#666;margin-top:4px;">
        ${escapeHtml(proposal.reason)}
      </div>
    `;
  }

  if (proposal.isApplySupported) {
    html += `
      <label style="display:block;margin-top:6px;">
        <input
          type="checkbox"
          class="wmeph-row-apply-checkbox"
          data-proposal-id="${escapeHtml(proposal.id ?? "")}"
        />
        Apply this fix
      </label>
    `;
  } else {
    const manualText =
      proposal.actionType === "manual-only"
        ? "Manual action required"
        : "This suggestion is not applyable yet";

    html += `
      <div style="color:#888;margin-top:6px;">
        ${escapeHtml(manualText)}
      </div>
    `;
  }

  html += `</div>`;

  return html;
}

function renderIssue(
  issue: PlaceIssue,
  proposals: PlaceProposal[]
): string {
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

  for (let index = 0; index < proposals.length; index += 1) {
    html += renderProposal(issue, proposals[index], index);
  }

  html += `</div>`;

  return html;
}

export function renderFeatureEditorAnalysis(
  placeName: string,
  chainId: string | null,
  issues: PlaceIssue[],
  proposals: PlaceProposal[],
  statusMessage?: { kind: "success" | "warning" | "error"; text: string }
): void {
  const container = ensureFeatureEditorContainer();

  if (!container) {
    return;
  }

  let html = "";
  const issueGroups = groupIssuesForFeatureEditor(issues, proposals);

  html += `
  <div style="
    display:flex;
    flex-direction:column;
    max-height:300px;
  ">

  <div style=" font-weight:600; margin-bottom:8px;">
    Place Harmonizer
  </div>

  <div style="
    overflow-y:auto;
    max-height:260px;
    padding-right:4px;
  ">
  `;

  if (statusMessage) {
    let color = "#2e7d32";

    if (statusMessage.kind === "warning") {
      color = "#b26a00";
    }

    if (statusMessage.kind === "error") {
      color = "#b00020";
    }

    html += `
      <div style="
        border: 1px solid ${color};
        border-radius: 4px;
        padding: 8px;
        margin-bottom: 8px;
        color: ${color};
        background: #fff;
      ">
        ${escapeHtml(statusMessage.text)}
      </div>
    `;
  }

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
      <div>${issueGroups.length}</div>
    </div>
  `;

  if (issueGroups.length === 0) {
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
    for (const group of issueGroups) {
      html += renderIssue(
        {
          field: group.field,
          severity: group.severity,
          message: group.message
        },
        group.proposals
      );
    }
  }

  const hasApplyableProposals = proposals.some((proposal) => proposal.isApplySupported);

  if (hasApplyableProposals) {
    html += `
      <div style="margin-top:12px;">
        <button id="wmeph-row-apply-selected" type="button">
          Apply selected fixes
        </button>
      </div>
    `;
  }

    html += `
  </div>
  </div>
  `;
  
  container.innerHTML = html;

}
