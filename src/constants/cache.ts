import { APP_SHORT_NAME } from "./app";

export const CACHE_KEYS = {
  manifest: `${APP_SHORT_NAME}:cache:manifest`,
  manifestRevision: `${APP_SHORT_NAME}:cache:manifestRevision`
} as const;