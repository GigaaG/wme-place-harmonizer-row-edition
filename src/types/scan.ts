export interface ScannedVenueResult {
  venueId: string;
  name: string;
  issueCount: number;
  hasErrors: boolean;
  hasWarnings: boolean;
}

export interface VisibleVenueScanSummary {
  total: number;
  ok: number;
  warning: number;
  error: number;
  results: ScannedVenueResult[];
}