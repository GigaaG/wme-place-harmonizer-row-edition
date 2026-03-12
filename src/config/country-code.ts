export function normalizeCountryCode(country?: string | null): string | undefined {
  if (typeof country !== "string") {
    return undefined;
  }

  const normalized = country.trim().toLowerCase();

  return normalized.length > 0 ? normalized : undefined;
}

const ISO3_TO_ISO2: Record<string, string> = {
  nld: "nl"
};

export function getCountryCodeCandidates(country?: string | null): string[] {
  const normalized = normalizeCountryCode(country);

  if (!normalized) {
    return [];
  }

  const candidates = new Set<string>([normalized]);

  const iso2 = ISO3_TO_ISO2[normalized];
  if (iso2) {
    candidates.add(iso2);
  }

  if (/^[a-z]{3}$/.test(normalized)) {
    candidates.add(normalized.slice(0, 2));
  }

  return Array.from(candidates);
}
