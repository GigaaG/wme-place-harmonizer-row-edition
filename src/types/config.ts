import type { GeometryType } from "./chains";
import type { AddressPolicy, PresenceRequirement } from "./address";
import type { LocalizedTextList } from "./i18n";
import type { IssueSeverity } from "./issue";
import type {
  GoogleMapsValidationCheckKey,
  GoogleMapsValidationChecks
} from "./settings";
 
// This type intentionally models the subset of config that the current
// userscript runtime actively consumes.
export type SupportedConfigType =
  | "global-config"
  | "community-config"
  | "country-config"
  | "state-config";

export interface RuleConfig {
  enabled: boolean;
  severity: "info" | "warning" | "error";
}

export interface PhoneFormattingConfig {
  countryCode?: string;
  formatStyle?: "national" | "international";
  validationPatterns?: string[];
  validationExamples?: string[];
  validationMessage?: string;
  validationMessageKey?: string;
}

export interface UrlFormattingConfig {
  validationPatterns?: string[];
  validationExamples?: string[];
  validationMessage?: string;
  validationMessageKey?: string;
}

export interface FormattingConfig {
  phone?: PhoneFormattingConfig;
  url?: UrlFormattingConfig;
}

export interface ConfigDefaults {
  locale?: string;
}

export interface GeometryStandard {
  required?: GeometryType;
  recommended?: GeometryType;
  allowed?: GeometryType[];
}

export interface ServiceStandard {
  required?: string[];
  recommended?: string[];
  discouraged?: string[];
  forbidden?: string[];
}

export interface CategoryStandard {
  geometry?: GeometryStandard;
  lockLevel?: number;
  cityInVenueName?: boolean;
  phone?: PresenceRequirement;
  url?: PresenceRequirement;
  openingHours?: PresenceRequirement;
  navigationPoints?: PresenceRequirement;
  externalProviderIds?: PresenceRequirement;
  services?: ServiceStandard;
  address?: AddressPolicy;
  editorNotes?: LocalizedTextList;
}

export interface RuntimeRulesConfig {
  cityInVenueName?: RuleConfig;
  [ruleId: string]: RuleConfig | undefined;
}

export interface GoogleMapsValidationConfig {
  enabled?: boolean;
  checks?: Partial<GoogleMapsValidationChecks>;
  severity?: Partial<Record<GoogleMapsValidationCheckKey, IssueSeverity>>;
  nameLocales?: string[];
}

export interface HarmonizerConfig {
  id: string;
  type: SupportedConfigType;
  version: number;
  extends?: string;

  defaults?: ConfigDefaults;
  formatting?: FormattingConfig;
  rules?: RuntimeRulesConfig;
  googleMapsValidation?: GoogleMapsValidationConfig;
  categoryStandards?: Record<string, CategoryStandard>;
}
