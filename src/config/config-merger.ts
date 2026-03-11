import type { HarmonizerConfig } from "../types/config";

export function mergeConfigs(
  base: HarmonizerConfig,
  override: HarmonizerConfig
): HarmonizerConfig {
  return {
    ...base,
    ...override,

    defaults: {
      ...base.defaults,
      ...override.defaults
    },

    formatting: {
      ...base.formatting,
      ...override.formatting
    },

    matching: {
      ...base.matching,
      ...override.matching
    },

    highlighting: {
      ...base.highlighting,
      ...override.highlighting
    },

    rules: {
      ...base.rules,
      ...override.rules
    },

    categoryStandards: {
      ...base.categoryStandards,
      ...override.categoryStandards
    }
  };
}