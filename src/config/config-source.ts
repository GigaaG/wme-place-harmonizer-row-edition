import {
  DATA_REPOSITORY_OWNER,
  DATA_REPOSITORY_NAME,
  DATA_REPOSITORY_BRANCH,
  appendQueryParam
} from "./source.ts";
import { cacheManager } from "../cache/cache-manager.ts";
import { CACHE_KEYS } from "../constants/cache.ts";

function getManifestRevision(): string | undefined {
  try {
    const revision = cacheManager.get<string>(CACHE_KEYS.manifestRevision);

    if (typeof revision === "string" && revision.trim().length > 0) {
      return revision.trim();
    }
  } catch {
    // Ignore storage access failures and fall back to the plain URL.
  }

  return undefined;
}

export function getConfigUrl(path: string): string {
  const url = `https://raw.githubusercontent.com/${DATA_REPOSITORY_OWNER}/${DATA_REPOSITORY_NAME}/${DATA_REPOSITORY_BRANCH}/${path}`;
  const manifestRevision = getManifestRevision();

  return manifestRevision
    ? appendQueryParam(url, "rev", manifestRevision)
    : url;
}
