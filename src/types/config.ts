export interface ConfigMeta {
  name?: string;
  description?: string;
}

export interface ConfigScope {
  country?: string;
  countries?: string[];
}

export interface RuleConfig {
  enabled: boolean;
  severity?: "info" | "warning" | "error";
}

export interface HarmonizerConfig {
  id: string;
  type: string;
  version: number;
  extends?: string;

  meta?: ConfigMeta;
  scope?: ConfigScope;

  defaults?: Record<string, unknown>;
  formatting?: Record<string, unknown>;
  matching?: Record<string, unknown>;
  highlighting?: Record<string, unknown>;

  rules?: Record<string, RuleConfig>;
}