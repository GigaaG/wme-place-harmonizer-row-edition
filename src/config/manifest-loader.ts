import type { DataChannel } from "../constants/app";
import { logger } from "../logging/logger";
import { fetchJson } from "../network/fetch-json";
import { getManifestUrl } from "./source";
import type { DataManifest } from "../types/manifest";
import { cacheManager } from "../cache/cache-manager";
import { CACHE_KEYS } from "../constants/cache";

function isValidManifest(value: unknown): value is DataManifest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const manifest = value as Partial<DataManifest>;

  return (
    (manifest.channel === "stable" || manifest.channel === "dev") &&
    typeof manifest.version === "string" &&
    typeof manifest.generatedAt === "string" &&
    typeof manifest.dataRevision === "string" &&
    typeof manifest.files === "object"
  );
}

export async function loadManifest(channel: DataChannel): Promise<DataManifest> {
  const url = getManifestUrl(channel);

  logger.info(`Loading manifest from ${url}`);

  try {
    const manifest = await fetchJson<unknown>(url);

    if (!isValidManifest(manifest)) {
      throw new Error("Invalid manifest structure");
    }

    logger.info(
      `Loaded manifest ${manifest.channel} v${manifest.version} (revision: ${manifest.dataRevision})`
    );

    cacheManager.set(CACHE_KEYS.manifest, manifest);
    cacheManager.set(CACHE_KEYS.manifestRevision, manifest.dataRevision);

    return manifest;
  } catch (error) {
    logger.warn("Manifest fetch failed, trying cached manifest");

    const cached = cacheManager.get<DataManifest>(CACHE_KEYS.manifest);

    if (cached) {
      logger.warn(
        `Using cached manifest ${cached.channel} v${cached.version} (revision: ${cached.dataRevision})`
      );
      return cached;
    }

    throw new Error("No manifest available (network + cache failed)");
  }
}