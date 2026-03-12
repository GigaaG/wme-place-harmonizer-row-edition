export type ScanSeverity = "ok" | "warning" | "error";

export interface ScannedVenueResult {
  venueId: string;
  name: string;
  issueCount: number;
  hasErrors: boolean;
  hasWarnings: boolean;
  severity: ScanSeverity;
}

export interface VisibleVenueScanSummary {
  total: number;
  ok: number;
  warning: number;
  error: number;
  results: ScannedVenueResult[];
}