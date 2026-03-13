import type { AddressPolicy, PresenceRequirement } from "./address";

export type GeometryType = "point" | "polygon";

export interface GeometryPolicy {
  required?: GeometryType;
  recommended?: GeometryType;
  allowed?: GeometryType[];
}

export interface ServicePolicy {
  required?: string[];
  recommended?: string[];
  discouraged?: string[];
  forbidden?: string[];
}

export interface OpeningHourDefinition {
  days: number[];
  fromHour: string;
  toHour: string;
}

export interface ChainMatchDefinition {
  aliases?: string[];
  regex?: string[];
  categoryAnyOf?: string[];
}

export interface ChainStandardDefinition {
  name?: string;
  brand?: string;
  categories?: string[];
  description?: string;
  url?: string;
  aliases?: string[];
  optionalAliases?: string[];
  services?: string[];
  openingHoursTemplate?: OpeningHourDefinition[] | null;
  externalProviderIds?: string[];
}

export interface ChainPolicyDefinition {
  geometry?: GeometryPolicy;
  lockLevel?: number;
  cityInVenueName?: boolean;
  phone?: PresenceRequirement;
  url?: PresenceRequirement;
  openingHours?: PresenceRequirement;
  externalProviderIds?: PresenceRequirement;
  services?: ServicePolicy;
  address?: AddressPolicy;
}

export interface ChainScopeDefinition {
  level?: "global" | "community" | "country";
  communities?: string[];
  countries?: string[];
}

export interface ChainMetaDefinition {
  description?: string;
  notes?: string;
}

export interface ChainRecord {
  id: string;
  canonicalName: string;
  match?: ChainMatchDefinition;
  standard?: ChainStandardDefinition;
  policy?: ChainPolicyDefinition;
  scope?: ChainScopeDefinition;
  meta?: ChainMetaDefinition;
}

export interface ChainDataset {
  id: string;
  type: "chain-dataset";
  version: number;
  items: ChainRecord[];
}
