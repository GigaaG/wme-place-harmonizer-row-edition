export type GeometryType = "point" | "polygon";

export interface GeometryPolicy {
  required?: GeometryType;
  recommended?: GeometryType;
  allowed?: GeometryType[];
}

export interface ServicePolicy {
  required?: string[];
  recommended?: string[];
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
  requirePhone?: boolean;
  requireUrl?: boolean;
  requireOpeningHours?: boolean;
  requireExternalProvider?: boolean;
  services?: ServicePolicy;
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