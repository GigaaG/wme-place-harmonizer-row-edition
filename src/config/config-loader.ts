import { logger } from "../logging/logger.ts";
import { fetchJson } from "../network/fetch-json.ts";
import type {
  HarmonizerConfig,
  RuntimeRulesConfig,
  SupportedConfigType
} from "../types/config.ts";
import type { IssueSeverity } from "../types/issue.ts";
import { GOOGLE_MAPS_VALIDATION_CHECK_KEYS } from "../types/settings.ts";
import { getConfigUrl } from "./config-source.ts";

const SUPPORTED_CONFIG_TYPES = new Set<SupportedConfigType>([
  "global-config",
  "community-config",
  "country-config",
  "state-config"
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidSeverity(value: unknown): value is "info" | "warning" | "error" {
  return value === "info" || value === "warning" || value === "error";
}

function validateRules(
  value: unknown,
  path: string
): RuntimeRulesConfig | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isPlainObject(value)) {
    throw new Error(`Config rules must be an object: ${path}`);
  }

  for (const [ruleId, rule] of Object.entries(value)) {
    if (!isPlainObject(rule)) {
      throw new Error(`Config rule must be an object: ${path} -> ${ruleId}`);
    }

    if (typeof rule.enabled !== "boolean") {
      throw new Error(`Config rule must define boolean enabled: ${path} -> ${ruleId}`);
    }

    if (!isValidSeverity(rule.severity)) {
      throw new Error(`Config rule must define valid severity: ${path} -> ${ruleId}`);
    }
  }

  return value as RuntimeRulesConfig;
}

function validateGoogleMapsValidationConfig(
  value: unknown,
  path: string
): void {
  if (value === undefined) {
    return;
  }

  if (!isPlainObject(value)) {
    throw new Error(`Config googleMapsValidation must be an object: ${path}`);
  }

  if (
    value.enabled !== undefined &&
    typeof value.enabled !== "boolean"
  ) {
    throw new Error(
      `Config googleMapsValidation.enabled must be a boolean: ${path}`
    );
  }

  if (value.checks !== undefined) {
    if (!isPlainObject(value.checks)) {
      throw new Error(
        `Config googleMapsValidation.checks must be an object: ${path}`
      );
    }

    for (const checkKey of GOOGLE_MAPS_VALIDATION_CHECK_KEYS) {
      const checkValue = value.checks[checkKey];

      if (checkValue !== undefined && typeof checkValue !== "boolean") {
        throw new Error(
          `Config googleMapsValidation.checks.${checkKey} must be a boolean: ${path}`
        );
      }
    }
  }

  if (value.severity === undefined) {
    return;
  }

  if (!isPlainObject(value.severity)) {
    throw new Error(
      `Config googleMapsValidation.severity must be an object: ${path}`
    );
  }

  for (const checkKey of GOOGLE_MAPS_VALIDATION_CHECK_KEYS) {
    const severityValue = value.severity[checkKey] as IssueSeverity | undefined;

    if (severityValue !== undefined && !isValidSeverity(severityValue)) {
      throw new Error(
        `Config googleMapsValidation.severity.${checkKey} must be a valid severity: ${path}`
      );
    }
  }
}

export function validateConfigFile(
  value: unknown,
  path: string
): HarmonizerConfig {
  if (!isPlainObject(value)) {
    throw new Error(`Config must be a JSON object: ${path}`);
  }

  if (!hasNonEmptyString(value.id)) {
    throw new Error(`Config id must be a non-empty string: ${path}`);
  }

  if (
    !hasNonEmptyString(value.type) ||
    !SUPPORTED_CONFIG_TYPES.has(value.type as SupportedConfigType)
  ) {
    throw new Error(`Config type must be a supported config type: ${path}`);
  }

  if (!Number.isInteger(value.version) || value.version < 1) {
    throw new Error(`Config version must be a positive integer: ${path}`);
  }

  if (value.extends !== undefined && !hasNonEmptyString(value.extends)) {
    throw new Error(`Config extends must be a non-empty string when present: ${path}`);
  }

  if (value.defaults !== undefined) {
    if (!isPlainObject(value.defaults)) {
      throw new Error(`Config defaults must be an object: ${path}`);
    }

    if (
      value.defaults.locale !== undefined &&
      !hasNonEmptyString(value.defaults.locale)
    ) {
      throw new Error(`Config defaults.locale must be a non-empty string: ${path}`);
    }
  }

  if (value.formatting !== undefined && !isPlainObject(value.formatting)) {
    throw new Error(`Config formatting must be an object: ${path}`);
  }

  if (isPlainObject(value.formatting)) {
    for (const sectionName of ["phone", "url"] as const) {
      const section = value.formatting[sectionName];

      if (section !== undefined && !isPlainObject(section)) {
        throw new Error(`Config formatting.${sectionName} must be an object: ${path}`);
      }
    }
  }

  validateRules(value.rules, path);
  validateGoogleMapsValidationConfig(value.googleMapsValidation, path);

  if (value.categoryStandards !== undefined) {
    if (!isPlainObject(value.categoryStandards)) {
      throw new Error(`Config categoryStandards must be an object: ${path}`);
    }

    for (const [categoryKey, standard] of Object.entries(value.categoryStandards)) {
      if (!isPlainObject(standard)) {
        throw new Error(
          `Config category standard must be an object: ${path} -> ${categoryKey}`
        );
      }
    }
  }

  return value as HarmonizerConfig;
}

export async function loadConfigFile(path: string): Promise<HarmonizerConfig> {
  const url = getConfigUrl(path);

  logger.info(`Loading config ${path}`);

  const result = validateConfigFile(await fetchJson<unknown>(url), path);

  logger.info(`Loaded config ${result.id} v${result.version} from ${path}`);

  return result;
}
