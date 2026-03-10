export const APP_NAME = "WME Place Harmonizer ROW Edition";
export const APP_SHORT_NAME = "WMEPH-ROW";

export const DEFAULT_DATA_CHANNEL = "stable";
export const SUPPORTED_DATA_CHANNELS = ["stable", "dev"] as const;

export type DataChannel = (typeof SUPPORTED_DATA_CHANNELS)[number];