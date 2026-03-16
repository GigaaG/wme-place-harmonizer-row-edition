import type { PlaceIssue } from "../types/issue";
import type { UrlFormattingConfig } from "../types/config";

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getValidationRegexes(
  formatting?: UrlFormattingConfig
): RegExp[] {
  const patterns = formatting?.validationPatterns;

  if (!Array.isArray(patterns) || patterns.length === 0) {
    return [];
  }

  return patterns.flatMap((pattern) => {
    if (!hasText(pattern)) {
      return [];
    }

    try {
      return [new RegExp(pattern)];
    } catch {
      return [];
    }
  });
}

export function isUrlFormatValid(
  url: string,
  formatting?: UrlFormattingConfig
): boolean {
  const validationRegexes = getValidationRegexes(formatting);

  if (validationRegexes.length === 0) {
    return true;
  }

  const normalizedUrl = url.trim();

  return validationRegexes.some((regex) => regex.test(normalizedUrl));
}

function stripProtocol(url: string): string | undefined {
  const trimmed = url.trim();
  const normalized = trimmed.replace(/^https?:\/\//i, "");

  if (normalized === trimmed || normalized.length === 0) {
    return undefined;
  }

  return normalized;
}

function addHttpsProtocol(url: string): string | undefined {
  const trimmed = url.trim();

  if (trimmed.length === 0 || /^[A-Za-z][A-Za-z\d+\-.]*:\/\//.test(trimmed)) {
    return undefined;
  }

  return `https://${trimmed}`;
}

export function suggestUrlFormat(
  url: string,
  formatting?: UrlFormattingConfig
): string | undefined {
  if (!hasText(url)) {
    return undefined;
  }

  const trimmedUrl = url.trim();
  const suggestions = [stripProtocol(trimmedUrl), addHttpsProtocol(trimmedUrl)];

  for (const suggestion of suggestions) {
    if (!hasText(suggestion) || suggestion === trimmedUrl) {
      continue;
    }

    if (isUrlFormatValid(suggestion, formatting)) {
      return suggestion;
    }
  }

  return undefined;
}

export function buildUrlFormatIssue(
  url: string,
  formatting?: UrlFormattingConfig
): PlaceIssue | undefined {
  if (!hasText(url) || isUrlFormatValid(url, formatting)) {
    return undefined;
  }

  const message = hasText(formatting?.validationMessage)
    ? formatting.validationMessage.trim()
    : "URL format is invalid";
  const suggestedUrl = suggestUrlFormat(url, formatting);

  return {
    field: "url",
    severity: "warning",
    message,
    currentValue: url,
    expectedValue: suggestedUrl,
    ruleId: "urlValidation.format"
  };
}
