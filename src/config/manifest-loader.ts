import type { DataChannel } from "../constants/app.ts";
import { logger } from "../logging/logger.ts";
import { fetchJson } from "../network/fetch-json.ts";
import { getManifestUrl } from "./source.ts";
import type { DataManifest } from "../types/manifest.ts";
import { cacheManager } from "../cache/cache-manager.ts";
import { CACHE_KEYS } from "../constants/cache.ts";

const REQUIRED_MANIFEST_FILES = [
  "config/global.json",
  "chains/global.json"
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown manifest loading error";
}

export function validateManifest(value: unknown): DataManifest {
  if (!isPlainObject(value)) {
    throw new Error("Manifest must be a JSON object");
  }

  const manifest = value as Partial<DataManifest>;
  const { files } = manifest;

  if (manifest.channel !== "stable" && manifest.channel !== "dev") {
    throw new Error("Manifest channel must be 'stable' or 'dev'");
  }

  if (!hasNonEmptyString(manifest.version)) {
    throw new Error("Manifest version must be a non-empty string");
  }

  if (
    !hasNonEmptyString(manifest.generatedAt) ||
    Number.isNaN(Date.parse(manifest.generatedAt))
  ) {
    throw new Error("Manifest generatedAt must be a valid ISO timestamp");
  }

  if (!hasNonEmptyString(manifest.dataRevision)) {
    throw new Error("Manifest dataRevision must be a non-empty string");
  }

  if (!isPlainObject(files)) {
    throw new Error("Manifest files must be an object");
  }

  for (const [path, entry] of Object.entries(files)) {
    if (!isPlainObject(entry)) {
      throw new Error(`Manifest file entry must be an object: ${path}`);
    }

    if (typeof entry.required !== "boolean") {
      throw new Error(`Manifest file entry must contain boolean 'required': ${path}`);
    }
  }

  for (const requiredPath of REQUIRED_MANIFEST_FILES) {
    const entry = files[requiredPath];

    if (!isPlainObject(entry) || entry.required !== true) {
      throw new Error(`Manifest must mark core file as required: ${requiredPath}`);
    }
  }

  return manifest as DataManifest;
}

export async function loadManifest(channel: DataChannel): Promise<DataManifest> {
  const url = getManifestUrl(channel);

  logger.info(`Loading manifest from ${url}`);

  try {
    const manifest = validateManifest(await fetchJson<unknown>(url));

    logger.info(
      `Loaded manifest ${manifest.channel} v${manifest.version} (revision: ${manifest.dataRevision})`
    );

    cacheManager.set(CACHE_KEYS.manifest, manifest);
    cacheManager.set(CACHE_KEYS.manifestRevision, manifest.dataRevision);

    return manifest;
  } catch (error) {
    const message = getErrorMessage(error);
    logger.warn(`Manifest load failed: ${message}. Trying cached manifest`);

    const cached = cacheManager.get<DataManifest>(CACHE_KEYS.manifest);

    if (cached) {
      try {
        const manifest = validateManifest(cached);
        logger.warn(
          `Using cached manifest ${manifest.channel} v${manifest.version} (revision: ${manifest.dataRevision})`
        );
        return manifest;
      } catch (cachedError) {
        logger.warn(`Cached manifest is invalid: ${getErrorMessage(cachedError)}`);
      }
    }

    throw new Error(`No valid manifest available: ${message}`);
  }
}
