import { APP_STORAGE_PREFIX } from "./app";

export const CACHE_KEYS = {
  manifest: `${APP_STORAGE_PREFIX}:cache:manifest`,
  manifestRevision: `${APP_STORAGE_PREFIX}:cache:manifestRevision`
} as const;
