export interface SidebarDebugState {
  scriptName: string;
  dataChannel: string;
  manifestVersion: string;
  manifestRevision: string;
  runtimeConfigId: string;
  runtimeConfigVersion: number;
  runtimeChainsId: string;
  runtimeChainsCount: number;
  lastStatus?: string;
  lastScanSummary?: {
    total: number;
    ok: number;
    warning: number;
    error: number;
  };
  highlightsEnabled?: boolean;
  autoScanVisibleVenues?: boolean;
}

let sidebarDebugState: SidebarDebugState | null = null;

export function setSidebarDebugState(state: SidebarDebugState): void {
  sidebarDebugState = state;
}

export function getSidebarDebugState(): SidebarDebugState | null {
  return sidebarDebugState;
}