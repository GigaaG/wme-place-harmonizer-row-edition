import type { DataChannel } from "../constants/app";

export interface UserSettings {
  dataChannel: DataChannel;
  debugEnabled: boolean;
  fallbackCountry?: string;
  autoScanVisibleVenues: boolean;
}
