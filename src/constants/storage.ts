import { APP_SHORT_NAME } from "./app";

export const STORAGE_KEYS = {
  settings: `${APP_SHORT_NAME}:settings`,
  whitelist: `${APP_SHORT_NAME}:whitelist`,
  cache: `${APP_SHORT_NAME}:cache`
} as const;