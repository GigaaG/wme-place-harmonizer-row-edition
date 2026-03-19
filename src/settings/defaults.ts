import type { UserSettings } from "../types/settings";
import { DEFAULT_DATA_CHANNEL } from "../constants/app";

export function getDefaultSettings(): UserSettings {
  return {
    dataChannel: DEFAULT_DATA_CHANNEL,
    debugEnabled: false,
    fallbackCountry: undefined,
    autoScanVisibleVenues: true
  };
}
