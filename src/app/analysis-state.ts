import type { PlaceIssue } from "../types/issue";
import type { PlaceProposal } from "../types/proposal";

export interface LatestAnalysisState {
  placeName: string;
  chainId: string | null;
  issues: PlaceIssue[];
  proposals: PlaceProposal[];
  isVenueSelection: boolean;
}

let latestAnalysisState: LatestAnalysisState | null = null;

export function setLatestAnalysisState(state: LatestAnalysisState): void {
  latestAnalysisState = state;
}

export function getLatestAnalysisState(): LatestAnalysisState | null {
  return latestAnalysisState;
}

export function clearLatestAnalysisState(): void {
  latestAnalysisState = null;
}