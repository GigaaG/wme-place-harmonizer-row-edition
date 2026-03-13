import type { GeometryType } from "./chains";
import type { AddressPolicy, PresenceRequirement } from "./address";

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
  phone?: PresenceRequirement;
  url?: PresenceRequirement;
  openingHours?: PresenceRequirement;
  externalProviderIds?: PresenceRequirement;
  services?: ServiceStandard;
  address?: AddressPolicy;
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
  categoryStandards?: Record<string, CategoryStandard>;
}
