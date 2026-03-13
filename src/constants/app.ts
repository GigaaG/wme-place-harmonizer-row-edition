import { IS_DEV_SCRIPT_BUILD } from "./build";

export const APP_NAME = "WME Place Harmonizer ROW Edition";
export const APP_SHORT_NAME = "WMEPH-ROW";
export const APP_STORAGE_PREFIX = IS_DEV_SCRIPT_BUILD
  ? `${APP_SHORT_NAME}:dev`
  : APP_SHORT_NAME;

export const SUPPORTED_DATA_CHANNELS = ["stable", "dev"] as const;

export type DataChannel = (typeof SUPPORTED_DATA_CHANNELS)[number];

export const DEFAULT_DATA_CHANNEL: DataChannel = IS_DEV_SCRIPT_BUILD
  ? "dev"
  : "stable";
