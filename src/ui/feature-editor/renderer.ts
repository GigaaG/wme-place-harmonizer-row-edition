import { ensureFeatureEditorContainer } from "./container.ts";
import type { PlaceIssue, IssueSeverity } from "../../types/issue";
import type { PlaceProposal } from "../../types/proposal";
import {
  groupIssuesForFeatureEditor,
  type FeatureEditorIssueGroup
} from "./issue-groups.ts";
import { t } from "../../i18n/runtime.ts";

export interface PendingWhitelistRenderAction {
  groupKey: string;
  field: string;
  severity: IssueSeverity;
  message: string;
  expiresInSeconds: number;
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
    return t("severity.error");
  }

  if (severity === "warning") {
    return t("severity.warning");
  }

  return t("severity.info");
}

function getSeverityColors(severity: string): {
  border: string;
  background: string;
  text: string;
} {
  if (severity === "error") {
    return {
      border: "#d32f2f",
      background: "#fff5f5",
      text: "#8b1e1e"
    };
  }

  if (severity === "warning") {
    return {
      border: "#f9a825",
      background: "#fff8e1",
      text: "#8a5a00"
    };
  }

  return {
    border: "#1e88e5",
    background: "#f1f8ff",
    text: "#0b5394"
  };
}

function getInlineActionButtonStyle(color: string): string {
  return [
    "background:none",
    "border:none",
    "padding:0",
    "margin:0",
    `color:${color}`,
    "font-size:12px",
    "font-weight:600",
    "line-height:1.2",
    "cursor:pointer",
    "text-decoration:underline",
    "text-underline-offset:2px",
    "white-space:nowrap"
  ].join(";");
}

function renderIssueCardFooter(
  content: string,
  justifyContent = "flex-end"
): string {
  return `
    <div style="
      margin-top:8px;
      display:flex;
      flex-wrap:wrap;
      align-items:center;
      justify-content:${justifyContent};
      column-gap:8px;
      row-gap:4px;
    ">
      ${content}
    </div>
  `;
}

function renderIssueFieldRow(
  field: string,
  whitelistGroupKey?: string,
  whitelistTextColor?: string
): string {
  const fieldContent = `
    <span>${escapeHtml(t("featureEditor.field"))}: ${escapeHtml(field)}</span>
  `;

  const whitelistButton =
    whitelistGroupKey && whitelistTextColor
      ? `
        <button
          type="button"
          class="wmeph-row-whitelist-issue"
          data-group-key="${escapeHtml(whitelistGroupKey)}"
          style="${getInlineActionButtonStyle(whitelistTextColor)}"
        >
          ${escapeHtml(t("featureEditor.ignoreForThisVenue"))}
        </button>
      `
      : "";

  return `
    <div style="
      font-size:12px;
      color:#666;
      margin-bottom:4px;
      display:flex;
      flex-wrap:wrap;
      align-items:center;
      justify-content:space-between;
      column-gap:8px;
      row-gap:4px;
    ">
      ${fieldContent}
      ${whitelistButton}
    </div>
  `;
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDisplayValue(value: unknown): string {
  const serialized = JSON.stringify(value);
  return escapeHtml(serialized ?? t("common.missing"));
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
  index: number,
  renderApplyControl = true,
  renderCurrentValue = true
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
    renderCurrentValue &&
    (proposal.currentValue !== undefined ||
      (proposal.displayCurrentValue ?? "").trim().length > 0)
  ) {
    html += `
      <div>
        <b>${escapeHtml(t("featureEditor.current"))}:</b> ${formatProposalValue(
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
        <b>${escapeHtml(t("featureEditor.suggested"))}:</b> ${formatLinkedProposalValue(
          proposal.proposedValue,
          proposal.displayProposedValue,
          proposal.displayProposedValueUrl
        )}
      </div>
    `;
  }

  if (shouldRenderProposalReason(issue, proposal)) {
    html += `
      <div style="color:#666;margin-top:4px;">
        ${escapeHtml(proposal.reason)}
      </div>
    `;
  }

  if (proposal.isApplySupported) {
    if (renderApplyControl) {
      html += `
        <label style="display:block;margin-top:6px;">
          <input
            type="checkbox"
            class="wmeph-row-apply-checkbox"
            data-proposal-id="${escapeHtml(proposal.id ?? "")}"
          />
          ${escapeHtml(t("featureEditor.applyThisFix"))}
        </label>
      `;
    }
  } else {
    const manualText =
      proposal.actionType === "manual-only"
        ? t("featureEditor.manualActionRequired")
        : t("featureEditor.suggestionNotApplicableYet");

    html += `
      <div style="color:#888;margin-top:6px;">
        ${escapeHtml(manualText)}
      </div>
    `;
  }

  html += `</div>`;

  return html;
}

function shouldRenderProposalReason(
  issue: PlaceIssue,
  proposal: PlaceProposal
): boolean {
  if (!proposal.reason || proposal.reason === issue.message) {
    return false;
  }

  if (proposal.field === "aliases") {
    return false;
  }

  return true;
}

function isExternalProviderChoiceProposal(proposal: PlaceProposal): boolean {
  return (
    proposal.field === "externalProviderIds" &&
    proposal.isApplySupported &&
    typeof proposal.externalProviderTargetId === "string" &&
    proposal.externalProviderTargetId.trim().length > 0
  );
}

function shouldRenderAsSingleChoiceGroup(
  group: FeatureEditorIssueGroup
): boolean {
  return (
    group.field === "externalProviderIds" &&
    group.proposals.filter((proposal) => isExternalProviderChoiceProposal(proposal))
      .length > 1
  );
}

function shouldRenderSharedCurrentValueGroup(
  group: FeatureEditorIssueGroup
): boolean {
  return group.field === "aliases" && group.proposals.length > 1;
}

function renderExternalProviderChoiceGroup(
  issue: PlaceIssue,
  group: FeatureEditorIssueGroup
): string {
  let html = "";
  const currentValue = group.proposals[0];
  const radioName = `wmeph-row-external-provider-${group.key}`;

  if (
    currentValue &&
    (currentValue.currentValue !== undefined ||
      (currentValue.displayCurrentValue ?? "").trim().length > 0)
  ) {
    html += `
      <div style="font-size:12px;margin-top:6px;">
        <b>${escapeHtml(t("featureEditor.current"))}:</b> ${formatProposalValue(
          currentValue.currentValue,
          currentValue.displayCurrentValue
        )}
      </div>
    `;
  }

  for (let index = 0; index < group.proposals.length; index += 1) {
    const proposal = group.proposals[index];
    const suggestedValue = formatLinkedProposalValue(
      proposal.proposedValue,
      proposal.displayProposedValue,
      proposal.displayProposedValueUrl
    );

    html += `
      <label style="
        display:block;
        font-size:12px;
        margin-top:${index === 0 ? 6 : 8}px;
        ${index > 0 ? "padding-top:8px;border-top:1px solid #eee;" : ""}
      ">
        <input
          type="radio"
          name="${escapeHtml(radioName)}"
          class="wmeph-row-apply-radio"
          data-proposal-id="${escapeHtml(proposal.id ?? "")}"
        />
        <span style="margin-left:4px;">
          <b>${escapeHtml(t("featureEditor.suggested"))}:</b> ${suggestedValue}
        </span>
      </label>
    `;

    if (shouldRenderProposalReason(issue, proposal)) {
      html += `
        <div style="font-size:12px;color:#666;margin-top:4px;margin-left:20px;">
          ${escapeHtml(proposal.reason)}
        </div>
      `;
    }
  }

  return html;
}

function renderSharedCurrentValueGroup(
  issue: PlaceIssue,
  group: FeatureEditorIssueGroup,
  footerCheckboxProposalId?: string
): string {
  let html = "";
  const currentValue = group.proposals[0];

  if (
    currentValue &&
    (currentValue.currentValue !== undefined ||
      (currentValue.displayCurrentValue ?? "").trim().length > 0)
  ) {
    html += `
      <div style="font-size:12px;margin-top:6px;">
        <b>${escapeHtml(t("featureEditor.current"))}:</b> ${formatProposalValue(
          currentValue.currentValue,
          currentValue.displayCurrentValue
        )}
      </div>
    `;
  }

  for (let index = 0; index < group.proposals.length; index += 1) {
    const proposal = group.proposals[index];
    html += renderProposal(
      issue,
      proposal,
      index,
      proposal.id !== footerCheckboxProposalId,
      false
    );
  }

  return html;
}

function renderIssue(group: FeatureEditorIssueGroup): string {
  let html = "";
  const colors = getSeverityColors(group.severity);
  const canWhitelist = group.issues.some((issue) => !!issue.ruleId);
  const shouldRenderSharedCurrentValue = shouldRenderSharedCurrentValueGroup(group);
  const sharedCurrentValueFooterCheckboxProposal =
    shouldRenderSharedCurrentValue &&
    group.proposals.length > 0 &&
    group.proposals[group.proposals.length - 1].isApplySupported
      ? group.proposals[group.proposals.length - 1]
      : null;
  const shouldRenderSharedFooterCheckbox =
    !shouldRenderAsSingleChoiceGroup(group) &&
    !shouldRenderSharedCurrentValue &&
    group.proposals.length === 1 &&
    group.proposals[0].isApplySupported;
  const footerCheckboxProposal =
    sharedCurrentValueFooterCheckboxProposal ??
    (shouldRenderSharedFooterCheckbox ? group.proposals[0] : null);

  html += `
    <div style="
      border: 1px solid ${colors.border};
      border-radius: 4px;
      padding: 8px;
      margin-top: 8px;
      background: ${colors.background};
    ">
  `;

  html += `
    <div style="font-weight:600; margin-bottom:4px; color:${colors.text};">
      ${getSeverityIcon(group.severity)} ${escapeHtml(getSeverityLabel(group.severity))}: ${escapeHtml(group.message)}
    </div>
  `;

  if (group.field) {
    html += renderIssueFieldRow(
      group.field,
      canWhitelist && !footerCheckboxProposal ? group.key : undefined,
      canWhitelist && !footerCheckboxProposal ? colors.text : undefined
    );
  }

  if (shouldRenderAsSingleChoiceGroup(group)) {
    html += renderExternalProviderChoiceGroup(group.issues[0], group);
  } else if (shouldRenderSharedCurrentValue) {
    html += renderSharedCurrentValueGroup(
      group.issues[0],
      group,
      footerCheckboxProposal?.id
    );
  } else {
    for (let index = 0; index < group.proposals.length; index += 1) {
      html += renderProposal(
        group.issues[0],
        group.proposals[index],
        index,
        !footerCheckboxProposal,
        true
      );
    }
  }

  if (footerCheckboxProposal || (canWhitelist && !group.field)) {
    let footerContent = "";

    if (footerCheckboxProposal) {
      footerContent += `
        <label style="
          display:flex;
          align-items:center;
          gap:4px;
          font-size:12px;
          font-weight:600;
          margin:0;
          flex:1 1 auto;
          min-width:0;
        ">
          <input
            type="checkbox"
            class="wmeph-row-apply-checkbox"
            data-proposal-id="${escapeHtml(footerCheckboxProposal.id ?? "")}"
          />
          <span>${escapeHtml(t("featureEditor.applyThisFix"))}</span>
        </label>
      `;
    }

    if (canWhitelist && (footerCheckboxProposal || !group.field)) {
      footerContent += `
        <button
          type="button"
          class="wmeph-row-whitelist-issue"
          data-group-key="${escapeHtml(group.key)}"
          style="${getInlineActionButtonStyle(colors.text)}"
        >
          ${escapeHtml(t("featureEditor.ignoreForThisVenue"))}
        </button>
      `;
    }

    html += renderIssueCardFooter(
      footerContent,
      footerCheckboxProposal && canWhitelist ? "space-between" : "flex-end"
    );
  }

  html += `</div>`;

  return html;
}

function renderPendingWhitelistAction(
  action: PendingWhitelistRenderAction
): string {
  let html = "";
  const colors = getSeverityColors(action.severity);

  html += `
    <div style="
      border: 1px dashed ${colors.border};
      border-radius: 4px;
      padding: 8px;
      margin-top: 8px;
      background: ${colors.background};
      opacity: 0.92;
    ">
  `;

  html += `
    <div style="font-weight:600; margin-bottom:4px; color:${colors.text};">
      ${getSeverityIcon(action.severity)} ${escapeHtml(getSeverityLabel(action.severity))}: ${escapeHtml(action.message)}
    </div>
  `;

  html += `
    ${renderIssueFieldRow(action.field)}
  `;

  html += renderIssueCardFooter(
    `
      <span
        class="wmeph-row-pending-whitelist-message"
        data-group-key="${escapeHtml(action.groupKey)}"
        style="font-size:12px; color:${colors.text};"
      >
        ${escapeHtml(t("featureEditor.ignorePending"))}
      </span>
      <button
        type="button"
        class="wmeph-row-undo-whitelist"
        data-group-key="${escapeHtml(action.groupKey)}"
        style="${getInlineActionButtonStyle(colors.text)}"
      >
        ${escapeHtml(t("featureEditor.undoIgnore"))} (${action.expiresInSeconds}s)
      </button>
    `,
    "space-between"
  );

  html += `</div>`;

  return html;
}

export function renderFeatureEditorAnalysis(
  placeName: string,
  chainId: string | null,
  issues: PlaceIssue[],
  proposals: PlaceProposal[],
  statusMessage?: { kind: "success" | "warning" | "error"; text: string },
  pendingWhitelistActions: PendingWhitelistRenderAction[] = []
): void {
  const container = ensureFeatureEditorContainer();

  if (!container) {
    return;
  }

  let html = "";
  const pendingWhitelistActionsByGroupKey = new Map(
    pendingWhitelistActions.map((action) => [action.groupKey, action])
  );
  const issueGroups = groupIssuesForFeatureEditor(issues, proposals);
  const issueGroupKeys = new Set(issueGroups.map((group) => group.key));
  const visibleIssueGroups = issueGroups.filter(
    (group) => !pendingWhitelistActionsByGroupKey.has(group.key)
  );
  const displayedFindingCount =
    issueGroups.length +
    pendingWhitelistActions.filter(
      (action) => !issueGroupKeys.has(action.groupKey)
    ).length;

  html += `
  <div style="
    display:flex;
    flex-direction:column;
    max-height:300px;
  ">

  <div style=" font-weight:600; margin-bottom:8px;">
    ${escapeHtml(t("featureEditor.title"))}
  </div>

  <div
    data-wmeph-row-scroll-container="true"
    style="
      overflow-y:auto;
      max-height:260px;
      padding-right:4px;
    "
  >
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
      <div><b>${escapeHtml(t("featureEditor.place"))}</b></div>
      <div>${escapeHtml(placeName)}</div>
    </div>
  `;

  html += `
    <div style="margin-bottom:8px;">
      <div><b>${escapeHtml(t("featureEditor.chain"))}</b></div>
      <div>${escapeHtml(chainId ?? t("common.none"))}</div>
    </div>
  `;

  html += `
    <div style="margin-bottom:8px;">
      <div><b>${escapeHtml(t("featureEditor.findings"))}</b></div>
      <div>${displayedFindingCount}</div>
    </div>
  `;

  if (displayedFindingCount === 0) {
    html += `
      <div style="
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 8px;
        background: #fff;
        color: green;
      ">
        ${escapeHtml(t("featureEditor.noFindings"))}
      </div>
    `;
  } else {
    const renderedPendingGroupKeys = new Set<string>();

    for (const group of issueGroups) {
      const pendingWhitelistAction = pendingWhitelistActionsByGroupKey.get(group.key);

      if (pendingWhitelistAction) {
        renderedPendingGroupKeys.add(group.key);
        html += renderPendingWhitelistAction(pendingWhitelistAction);
        continue;
      }

      html += renderIssue(group);
    }

    for (const pendingWhitelistAction of pendingWhitelistActions) {
      if (renderedPendingGroupKeys.has(pendingWhitelistAction.groupKey)) {
        continue;
      }

      html += renderPendingWhitelistAction(pendingWhitelistAction);
    }
  }

  const hasApplyableProposals = visibleIssueGroups.some((group) =>
    group.proposals.some((proposal) => proposal.isApplySupported)
  );

  if (hasApplyableProposals) {
    html += `
      <div style="margin-top:12px;">
        <button id="wmeph-row-apply-selected" type="button">
          ${escapeHtml(t("featureEditor.applySelectedFixes"))}
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
