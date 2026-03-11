export interface PlaceProposal {
  field: string;
  currentValue?: unknown;
  proposedValue?: unknown;
  reason: string;
  issueRuleId?: string;
  isApplySupported: boolean;

  actionType?: "set-field" | "add-service" | "remove-service" | "manual-only";
  serviceName?: string;
}