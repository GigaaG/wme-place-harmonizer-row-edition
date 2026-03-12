import type { DataChannel } from "../constants/app";

export interface UserSettings {
  locale?: string;
  dataChannel: DataChannel;
  debugEnabled: boolean;
  fallbackCountry?: string;
  autoScanVisibleVenues: boolean;
}