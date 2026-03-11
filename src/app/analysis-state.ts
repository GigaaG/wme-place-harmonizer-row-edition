import type { PlaceIssue } from "../types/issue";
import type { PlaceProposal } from "../types/proposal";

export interface AnalysisStatusMessage {
  kind: "success" | "warning" | "error";
  text: string;
}

export interface LatestAnalysisState {
  venueId: string;
  placeName: string;
  chainId: string | null;
  issues: PlaceIssue[];
  proposals: PlaceProposal[];
  currentServices: string[];
  isVenueSelection: boolean;
  statusMessage?: AnalysisStatusMessage;
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