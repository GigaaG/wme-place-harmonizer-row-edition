export type IssueSeverity = "error" | "warning" | "info";

export interface PlaceIssue {
  field: string;
  severity: IssueSeverity;
  message: string;
  groupKey?: string;
  groupMessage?: string;
  currentValue?: unknown;
  expectedValue?: unknown;
  ruleId?: string;
}
