export type IssueSeverity = "error" | "warning" | "info";

export interface PlaceIssue {
  field: string;
  severity: IssueSeverity;
  message: string;
  currentValue?: unknown;
  expectedValue?: unknown;
  ruleId?: string;
}