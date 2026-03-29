import { APP_STORAGE_PREFIX } from "./app.ts";

export const STORAGE_KEYS = {
  settings: `${APP_STORAGE_PREFIX}:settings`,
  whitelist: `${APP_STORAGE_PREFIX}:whitelist`,
  cache: `${APP_STORAGE_PREFIX}:cache`
} as const;
