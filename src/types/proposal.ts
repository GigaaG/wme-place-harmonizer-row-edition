export interface PlaceProposal {
  id?: string;
  field: string;
  currentValue?: unknown;
  proposedValue?: unknown;
  displayCurrentValue?: string;
  displayProposedValue?: string;
  displayProposedValueUrl?: string;
  externalProviderSearchText?: string;
  externalProviderTargetId?: string;
  externalProviderTargetName?: string;
  externalProviderTargetAddress?: string;
  reason: string;
  issueRuleId?: string;
  isApplySupported: boolean;

  actionType?: "set-field" | "add-service" | "remove-service" | "manual-only";
  serviceName?: string;
}
