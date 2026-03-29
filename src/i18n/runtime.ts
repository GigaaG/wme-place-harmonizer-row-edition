import type { LocaleFile } from "../types/i18n.ts";
import { normalizeLocaleCode } from "./locale-utils.ts";

let runtimeLocaleCode = "en";
let runtimeMessages: Record<string, string> = {};

function interpolate(
  template: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{([a-zA-Z0-9_.-]+)\}/g, (_, key: string) => {
    const value = params[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

export function setRuntimeLocale(localeFile: LocaleFile): void {
  runtimeLocaleCode = normalizeLocaleCode(localeFile.locale) ?? "en";
  runtimeMessages = { ...localeFile.messages };
}

export function getRuntimeLocaleCode(): string {
  return runtimeLocaleCode;
}

export function t(
  key: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const template = runtimeMessages[key] ?? key;
  return interpolate(template, params);
}
