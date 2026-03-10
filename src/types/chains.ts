export interface ChainMatchDefinition {
  aliases?: string[];
  regex?: string[];
  categoryAnyOf?: string[];
}

export interface ChainStandardDefinition {
  name?: string;
  categories?: string[];
  brand?: string;
}

export interface ChainPolicyDefinition {
  geometry?: string;
  lockLevel?: number;
  requirePhone?: boolean;
  requireUrl?: boolean;
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