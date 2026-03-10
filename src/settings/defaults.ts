import type { UserSettings } from "../types/settings";
import { DEFAULT_DATA_CHANNEL } from "../constants/app";

export function getDefaultSettings(): UserSettings {
  return {
    locale: undefined,
    dataChannel: DEFAULT_DATA_CHANNEL,
    debugEnabled: false,
    fallbackCountry: undefined
  };
}