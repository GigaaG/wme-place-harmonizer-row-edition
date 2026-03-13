import assert from "node:assert/strict";

import { groupIssuesForFeatureEditor } from "../src/ui/feature-editor/issue-groups.ts";
import type { PlaceIssue } from "../src/types/issue.ts";
import type { PlaceProposal } from "../src/types/proposal.ts";

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest("groups multiple service suggestions into one feature-editor card", () => {
  const issues: PlaceIssue[] = [
    {
      field: "services",
      severity: "warning",
      message: "Recommended service missing: DRIVE_THROUGH",
      groupKey: "services.recommended",
      groupMessage: "Recommended services missing",
      ruleId: "services.recommended.DRIVE_THROUGH"
    },
    {
      field: "services",
      severity: "warning",
      message: "Recommended service missing: TAKEAWAY",
      groupKey: "services.recommended",
      groupMessage: "Recommended services missing",
      ruleId: "services.recommended.TAKEAWAY"
    }
  ];
  const proposals: PlaceProposal[] = [
    {
      id: "proposal-1",
      field: "services",
      groupKey: "services.recommended",
      proposedValue: "DRIVE_THROUGH",
      reason: "Recommended service missing: DRIVE_THROUGH",
      issueRuleId: "services.recommended.DRIVE_THROUGH",
      isApplySupported: true,
      actionType: "add-service",
      serviceName: "DRIVE_THROUGH"
    },
    {
      id: "proposal-2",
      field: "services",
      groupKey: "services.recommended",
      proposedValue: "TAKEAWAY",
      reason: "Recommended service missing: TAKEAWAY",
      issueRuleId: "services.recommended.TAKEAWAY",
      isApplySupported: true,
      actionType: "add-service",
      serviceName: "TAKEAWAY"
    }
  ];

  const groups = groupIssuesForFeatureEditor(issues, proposals);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].message, "Recommended services missing");
  assert.equal(groups[0].severity, "warning");
  assert.equal(groups[0].proposals.length, 2);
});

runTest("uses the highest severity inside a grouped alias card", () => {
  const issues: PlaceIssue[] = [
    {
      field: "aliases",
      severity: "warning",
      message: "Suggested alias missing: Starbucks Coffee",
      groupKey: "aliases.suggested",
      groupMessage: "Suggested aliases missing",
      ruleId: "aliases.suggested.Starbucks Coffee"
    },
    {
      field: "aliases",
      severity: "info",
      message: "Optional alias suggestion: SBX",
      groupKey: "aliases.suggested",
      groupMessage: "Suggested aliases missing",
      ruleId: "aliases.optional.SBX"
    }
  ];

  const groups = groupIssuesForFeatureEditor(issues, []);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].severity, "warning");
  assert.equal(groups[0].message, "Suggested aliases missing");
});

runTest("keeps informational cards informational when no stronger severity exists", () => {
  const issues: PlaceIssue[] = [
    {
      field: "",
      severity: "info",
      message: "Bus stops are not considered bus stations in the Netherlands.",
      ruleId: "editorNote.category.1"
    }
  ];

  const groups = groupIssuesForFeatureEditor(issues, []);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].severity, "info");
  assert.equal(groups[0].message, "Bus stops are not considered bus stations in the Netherlands.");
});
