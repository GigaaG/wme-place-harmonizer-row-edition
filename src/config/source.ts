import type { DataChannel } from "../constants/app";
import { IS_DEV_SCRIPT_BUILD } from "../constants/build";

export const DATA_REPOSITORY_OWNER = "GigaaG";
export const DATA_REPOSITORY_NAME = "wme-place-harmonizer-row-data";
export const DATA_REPOSITORY_BRANCH = IS_DEV_SCRIPT_BUILD ? "dev" : "main";

export function appendQueryParam(
  url: string,
  key: string,
  value: string
): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${key}=${encodeURIComponent(value)}`;
}

export function getManifestUrl(channel: DataChannel): string {
  const url = `https://raw.githubusercontent.com/${DATA_REPOSITORY_OWNER}/${DATA_REPOSITORY_NAME}/${DATA_REPOSITORY_BRANCH}/manifest/${channel}.json`;

  // Always bypass intermediary caching for the manifest so new data revisions are seen.
  return appendQueryParam(url, "ts", String(Date.now()));
}
