import type { PlaceIssue } from "../types/issue";
import type { PhoneFormattingConfig } from "../types/config";

const DUTCH_TWO_DIGIT_AREA_CODES = new Set([
  "10",
  "13",
  "15",
  "20",
  "23",
  "24",
  "26",
  "30",
  "33",
  "35",
  "36",
  "38",
  "40",
  "43",
  "45",
  "46",
  "50",
  "53",
  "55",
  "58",
  "70",
  "71",
  "72",
  "73",
  "74",
  "75",
  "76",
  "77",
  "78",
  "79"
]);

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizePhoneInput(phone: string): string {
  const trimmed = phone.trim();

  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D+/g, "")}`;
  }

  if (trimmed.startsWith("00")) {
    return `00${trimmed.slice(2).replace(/\D+/g, "")}`;
  }

  return trimmed.replace(/\D+/g, "");
}

function normalizeInternationalSeparators(phone: string): string | undefined {
  const trimmed = phone.trim();

  if (!trimmed.startsWith("+") && !trimmed.startsWith("00")) {
    return undefined;
  }

  const normalized = trimmed
    .replace(/^00/, "+")
    .replace(/[()./\\-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^\+\s+/, "+")
    .trim();

  return normalized.length > 0 ? normalized : undefined;
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

function formatDutchNationalNumber(nationalDigits: string): string | undefined {
  if (nationalDigits.length === 0) {
    return undefined;
  }

  if (
    (nationalDigits.startsWith("800") || nationalDigits.startsWith("900")) &&
    nationalDigits.length > 3
  ) {
    return `0${nationalDigits.slice(0, 3)} ${nationalDigits.slice(3)}`;
  }

  if (nationalDigits.startsWith("6") && nationalDigits.length === 9) {
    return `+31 6 ${nationalDigits.slice(1)}`;
  }

  if (nationalDigits.length !== 9 || !/^[1-57]\d{8}$/.test(nationalDigits)) {
    return undefined;
  }

  const areaCodeLength = DUTCH_TWO_DIGIT_AREA_CODES.has(
    nationalDigits.slice(0, 2)
  )
    ? 2
    : 3;

  return `+31 ${nationalDigits.slice(0, areaCodeLength)} ${nationalDigits.slice(areaCodeLength)}`;
}

function suggestDutchPhoneFormat(
  phone: string,
  formatting?: PhoneFormattingConfig
): string | undefined {
  const countryCode = formatting?.countryCode?.trim() ?? "+31";

  if (countryCode !== "+31") {
    return undefined;
  }

  const normalized = normalizePhoneInput(phone);

  if (!normalized) {
    return undefined;
  }

  if (normalized.startsWith("0800") || normalized.startsWith("0900")) {
    return formatDutchNationalNumber(normalized.slice(1));
  }

  if (normalized.startsWith("+31")) {
    const nationalDigits = normalized.slice(3).replace(/^0/, "");
    return formatDutchNationalNumber(nationalDigits);
  }

  if (normalized.startsWith("0031")) {
    const nationalDigits = normalized.slice(4).replace(/^0/, "");
    return formatDutchNationalNumber(nationalDigits);
  }

  if (normalized.startsWith("0")) {
    return formatDutchNationalNumber(normalized.slice(1));
  }

  return undefined;
}

export function suggestPhoneFormat(
  phone: string,
  formatting?: PhoneFormattingConfig
): string | undefined {
  if (!hasText(phone)) {
    return undefined;
  }

  const suggestions = [
    suggestDutchPhoneFormat(phone, formatting),
    normalizeInternationalSeparators(phone)
  ];

  const trimmedPhone = phone.trim();

  for (const suggestion of suggestions) {
    if (!hasText(suggestion) || suggestion === trimmedPhone) {
      continue;
    }

    if (isPhoneFormatValid(suggestion, formatting)) {
      return suggestion;
    }
  }

  return undefined;
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
  const suggestedPhone = suggestPhoneFormat(phone, formatting);

  return {
    field: "phone",
    severity: "warning",
    message,
    currentValue: phone,
    expectedValue: suggestedPhone,
    ruleId: "phoneValidation.format"
  };
}
