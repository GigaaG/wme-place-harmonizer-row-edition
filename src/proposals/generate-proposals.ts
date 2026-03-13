import type { PlaceIssue } from "../types/issue";
import type { PlaceProposal } from "../types/proposal";

const APPLY_SUPPORTED_FIELDS = new Set([
  "name",
  "lockLevel",
  "phone",
  "url",
  "openingHours"
]);

function readInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value)
    ? value
    : undefined;
}

function isPresenceExpectation(value: unknown): value is "present" | "absent" {
  return value === "present" || value === "absent";
}

export function generateProposals(
  issues: PlaceIssue[],
  options?: { editorLockLevel?: number }
): PlaceProposal[] {
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

      if (
        issue.ruleId?.startsWith("services.discouraged.") ||
        issue.ruleId?.startsWith("services.forbidden.")
      ) {
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
    // Lock level met editor-rank cap
    //
    if (issue.field === "lockLevel") {
      const currentLockLevel = readInteger(issue.currentValue);
      const recommendedLockLevel = readInteger(issue.expectedValue);
      const editorLockLevel = readInteger(options?.editorLockLevel);

      if (recommendedLockLevel === undefined) {
        continue;
      }

      const appliedLockLevel =
        editorLockLevel !== undefined
          ? Math.min(recommendedLockLevel, editorLockLevel)
          : recommendedLockLevel;

      const canApply =
        currentLockLevel === undefined ||
        appliedLockLevel > currentLockLevel;
      const isCappedByEditor =
        editorLockLevel !== undefined &&
        editorLockLevel < recommendedLockLevel;
      const reason = isCappedByEditor
        ? canApply
          ? `${issue.message}. Apply will raise the venue to ${appliedLockLevel}, capped by your editor lock level ${editorLockLevel}.`
          : `${issue.message}. Your editor lock level ${editorLockLevel} cannot raise this venue further.`
        : issue.message;

      proposals.push({
        field: "lockLevel",
        currentValue: currentLockLevel,
        proposedValue: canApply ? appliedLockLevel : recommendedLockLevel,
        reason,
        issueRuleId: issue.ruleId,
        isApplySupported: canApply,
        actionType: canApply ? "set-field" : "manual-only"
      });
      continue;
    }

    //
    // Gewone set-field proposals
    //
    if (isPresenceExpectation(issue.expectedValue)) {
      continue;
    }

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
