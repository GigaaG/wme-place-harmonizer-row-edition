import type { PlaceIssue } from "../types/issue";
import type { PlaceProposal } from "../types/proposal";

export function generateProposals(issues: PlaceIssue[]): PlaceProposal[] {

  const proposals: PlaceProposal[] = [];

  for (const issue of issues) {

    if (issue.expectedValue !== undefined) {

      proposals.push({

        field: issue.field,

        currentValue: issue.currentValue,

        proposedValue: issue.expectedValue,

        reason: issue.message,

        issueRuleId: issue.ruleId

      });

    }

  }

  return proposals;

}