import type { PlaceIssue, IssueSeverity } from "../../types/issue";
import type { PlaceProposal } from "../../types/proposal";

export interface FeatureEditorIssueGroup {
  key: string;
  field: string;
  severity: IssueSeverity;
  message: string;
  issues: PlaceIssue[];
  proposals: PlaceProposal[];
}

function getIssueGroupKey(issue: PlaceIssue): string {
  return issue.groupKey ?? `${issue.field}::${issue.ruleId ?? issue.message}`;
}

function getProposalGroupKey(proposal: PlaceProposal): string {
  return proposal.groupKey ?? `${proposal.field}::${proposal.issueRuleId ?? proposal.reason}`;
}

function getSeverityRank(severity: IssueSeverity): number {
  if (severity === "error") {
    return 3;
  }

  if (severity === "warning") {
    return 2;
  }

  return 1;
}

export function groupIssuesForFeatureEditor(
  issues: PlaceIssue[],
  proposals: PlaceProposal[]
): FeatureEditorIssueGroup[] {
  const proposalGroups = new Map<string, PlaceProposal[]>();

  for (const proposal of proposals) {
    const key = getProposalGroupKey(proposal);
    const existing = proposalGroups.get(key);

    if (existing) {
      existing.push(proposal);
    } else {
      proposalGroups.set(key, [proposal]);
    }
  }

  const groups = new Map<string, FeatureEditorIssueGroup>();

  for (const issue of issues) {
    const key = getIssueGroupKey(issue);
    const existing = groups.get(key);

    if (existing) {
      existing.issues.push(issue);

      if (getSeverityRank(issue.severity) > getSeverityRank(existing.severity)) {
        existing.severity = issue.severity;
      }

      continue;
    }

    groups.set(key, {
      key,
      field: issue.field,
      severity: issue.severity,
      message: issue.groupMessage ?? issue.message,
      issues: [issue],
      proposals: proposalGroups.get(key) ?? []
    });
  }

  return Array.from(groups.values());
}
