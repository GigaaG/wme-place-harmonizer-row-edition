import { logger } from "../logging/logger";
import { fetchJson } from "../network/fetch-json";
import { getConfigUrl } from "../config/config-source";
import type { DataManifest } from "../types/manifest";
import type { LocaleFile } from "../types/i18n.ts";
import { getLocaleCandidates } from "./locale-utils.ts";

function isLocaleFile(value: unknown): value is LocaleFile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const localeFile = value as Partial<LocaleFile>;

  return (
    typeof localeFile.locale === "string" &&
    !!localeFile.messages &&
    typeof localeFile.messages === "object" &&
    !Array.isArray(localeFile.messages)
  );
}

function hasManifestFile(manifest: DataManifest, path: string): boolean {
  return !!manifest.files[path];
}

async function loadLocaleFile(path: string): Promise<LocaleFile> {
  logger.info(`Loading locale ${path}`);

  const result = await fetchJson<unknown>(getConfigUrl(path));

  if (!isLocaleFile(result)) {
    throw new Error(`Invalid locale file: ${path}`);
  }

  return result;
}

export async function loadBestAvailableLocale(params: {
  manifest: DataManifest;
  preferredLocale?: string;
  fallbackLocale?: string;
}): Promise<LocaleFile> {
  const candidates = getLocaleCandidates(
    params.preferredLocale,
    params.fallbackLocale
  );

  for (const locale of candidates) {
    const path = `locales/${locale}.json`;

    if (!hasManifestFile(params.manifest, path)) {
      continue;
    }

    try {
      return await loadLocaleFile(path);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown locale loading error";
      logger.warn(`Failed to load locale ${locale}: ${message}`);
    }
  }

  throw new Error("No locale file available");
}
