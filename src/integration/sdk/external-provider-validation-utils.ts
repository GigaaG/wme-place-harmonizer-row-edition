export function trimString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeBusinessStatus(value: unknown): string | undefined {
  const trimmed = trimString(value);
  return trimmed ? trimmed.toUpperCase() : undefined;
}

export function buildValidationGroupKey(providerId: string, ruleId: string): string {
  return `externalProviderIds::validation:${providerId}:${ruleId}`;
}

export function appendReasonDetail(reason: string, detail?: string): string {
  return detail ? `${reason} | ${detail}` : reason;
}
