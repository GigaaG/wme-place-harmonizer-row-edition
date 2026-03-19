import type { LocalizedTextList } from "../types/i18n.ts";

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeLocaleCode(locale: string | undefined): string | undefined {
  if (typeof locale !== "string") {
    return undefined;
  }

  const normalized = locale.trim().replaceAll("_", "-").toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

export function getLocaleCandidates(
  preferredLocale?: string,
  fallbackLocale?: string
): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  const addLocale = (locale: string | undefined): void => {
    const normalized = normalizeLocaleCode(locale);

    if (!normalized) {
      return;
    }

    const variants = [normalized];
    const separatorIndex = normalized.indexOf("-");
    if (separatorIndex > 0) {
      variants.push(normalized.slice(0, separatorIndex));
    }

    for (const variant of variants) {
      if (seen.has(variant)) {
        continue;
      }

      seen.add(variant);
      candidates.push(variant);
    }
  };

  addLocale(preferredLocale);
  addLocale(fallbackLocale);
  addLocale("en");

  return candidates;
}

export function resolveLocalizedTextList(
  value: LocalizedTextList | string[] | undefined,
  preferredLocale?: string,
  fallbackLocale?: string
): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((entry) => (typeof entry === "string" ? normalizeWhitespace(entry) : ""))
          .filter((entry) => entry.length > 0)
      )
    );
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  for (const locale of getLocaleCandidates(preferredLocale, fallbackLocale)) {
    const entries = (value as Record<string, unknown>)[locale];

    if (!Array.isArray(entries)) {
      continue;
    }

    const normalizedEntries = Array.from(
      new Set(
        entries
          .map((entry) => (typeof entry === "string" ? normalizeWhitespace(entry) : ""))
          .filter((entry) => entry.length > 0)
      )
    );

    if (normalizedEntries.length > 0) {
      return normalizedEntries;
    }
  }

  return [];
}

export function mergeLocalizedTextLists(
  base?: LocalizedTextList,
  override?: LocalizedTextList
): LocalizedTextList | undefined {
  if (!base && !override) {
    return undefined;
  }

  const merged: LocalizedTextList = {};
  const localeKeys = new Set([
    ...Object.keys(base ?? {}),
    ...Object.keys(override ?? {})
  ]);

  for (const localeKey of localeKeys) {
    const entries = resolveLocalizedTextList(
      {
        [localeKey]: [
          ...((base?.[localeKey] ?? []) as string[]),
          ...((override?.[localeKey] ?? []) as string[])
        ]
      },
      localeKey
    );

    if (entries.length > 0) {
      merged[localeKey] = entries;
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}
