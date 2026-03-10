import { STORAGE_KEYS } from "../constants/storage";
import { getDefaultSettings } from "./defaults";
import type { UserSettings } from "../types/settings";

export class SettingsManager {
  load(): UserSettings {
    const raw = window.localStorage.getItem(STORAGE_KEYS.settings);

    if (!raw) {
      return getDefaultSettings();
    }

    try {
      const parsed = JSON.parse(raw) as Partial<UserSettings>;

      return {
        ...getDefaultSettings(),
        ...parsed
      };
    } catch {
      return getDefaultSettings();
    }
  }

  save(settings: UserSettings): void {
    window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  }
}

export const settingsManager = new SettingsManager();