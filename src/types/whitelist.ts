import type { PlaceIssue } from "./issue";
import type { PlaceProposal } from "./proposal";

export interface WhitelistRuntimeSnapshot {
  configId: string;
  configVersion: number;
  chainsId: string;
  chainsVersion: number;
}

export interface WhitelistEntry {
  placeId: string;
  ruleId: string;
  field: string;
  scope: "place";
  createdAt: string;
  updatedAt?: string;
  reason?: string;
  chainId?: string;
  country?: string;
  configId: string;
  configVersion: number;
  chainsId: string;
  chainsVersion: number;
}

export interface WhitelistStore {
  version: 1;
  items: WhitelistEntry[];
}

export interface WhitelistFilterResult {
  issues: PlaceIssue[];
  proposals: PlaceProposal[];
  suppressedIssueCount: number;
}
