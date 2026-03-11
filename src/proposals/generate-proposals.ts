import type { PlaceIssue } from "../types/issue";
import type { PlaceProposal } from "../types/proposal";

const APPLY_SUPPORTED_FIELDS = new Set([
  "name",
  "phone",
  "url",
  "openingHours"
]);

export function generateProposals(issues: PlaceIssue[]): PlaceProposal[] {
  const proposals: PlaceProposal[] = [];

  for (const issue of issues) {
    //
    // Brand voorlopig volledig overslaan
    //
    if (issue.field === "brand") {
      continue;
    }

    //
    // Services per service behandelen
    //
    if (issue.field === "services" && typeof issue.expectedValue === "string") {
      const serviceName = issue.expectedValue;

      if (issue.ruleId?.startsWith("services.required.") || issue.ruleId?.startsWith("services.recommended.")) {
        proposals.push({
          field: "services",
          currentValue: issue.currentValue,
          proposedValue: serviceName,
          reason: issue.message,
          issueRuleId: issue.ruleId,
          isApplySupported: true,
          actionType: "add-service",
          serviceName
        });
        continue;
      }

      if (issue.ruleId?.startsWith("services.forbidden.")) {
        proposals.push({
          field: "services",
          currentValue: issue.currentValue,
          proposedValue: serviceName,
          reason: issue.message,
          issueRuleId: issue.ruleId,
          isApplySupported: true,
          actionType: "remove-service",
          serviceName
        });
        continue;
      }
    }

    //
    // Geometry speciaal behandelen
    //
    if (issue.field === "geometry" && typeof issue.expectedValue === "string") {
      const current = issue.currentValue;
      const expected = issue.expectedValue;

      const isPolygonToPoint = current === "polygon" && expected === "point";
      const isPointToPolygon = current === "point" && expected === "polygon";

      proposals.push({
        field: "geometry",
        currentValue: current,
        proposedValue: expected,
        reason: issue.message,
        issueRuleId: issue.ruleId,
        isApplySupported: isPolygonToPoint,
        actionType: isPolygonToPoint ? "set-field" : "manual-only"
      });
      continue;
    }

    //
    // Gewone set-field proposals
    //
    if (issue.expectedValue !== undefined) {
      proposals.push({
        field: issue.field,
        currentValue: issue.currentValue,
        proposedValue: issue.expectedValue,
        reason: issue.message,
        issueRuleId: issue.ruleId,
        isApplySupported: APPLY_SUPPORTED_FIELDS.has(issue.field),
        actionType: APPLY_SUPPORTED_FIELDS.has(issue.field)
          ? "set-field"
          : "manual-only"
      });
    }
  }

  return proposals;
}