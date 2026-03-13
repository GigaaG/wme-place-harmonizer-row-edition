import type { PlaceIssue } from "../types/issue";
import type { PhoneFormattingConfig } from "../types/config";

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getValidationRegexes(
  formatting?: PhoneFormattingConfig
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

export function isPhoneFormatValid(
  phone: string,
  formatting?: PhoneFormattingConfig
): boolean {
  const validationRegexes = getValidationRegexes(formatting);

  if (validationRegexes.length === 0) {
    return true;
  }

  const normalizedPhone = phone.trim();

  return validationRegexes.some((regex) => regex.test(normalizedPhone));
}

export function buildPhoneFormatIssue(
  phone: string,
  formatting?: PhoneFormattingConfig
): PlaceIssue | undefined {
  if (!hasText(phone) || isPhoneFormatValid(phone, formatting)) {
    return undefined;
  }

  const message = hasText(formatting?.validationMessage)
    ? formatting.validationMessage.trim()
    : "Phone number format is invalid";

  return {
    field: "phone",
    severity: "warning",
    message,
    currentValue: phone,
    ruleId: "phoneValidation.format"
  };
}
