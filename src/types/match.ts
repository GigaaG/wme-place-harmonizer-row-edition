import type { ChainRecord } from "./chains";

export type ChainMatchMethod = "canonical" | "alias" | "regex" | "none";

export interface ChainMatchResult {
  matched: boolean;
  method: ChainMatchMethod;
  chain?: ChainRecord;
  matchedValue?: string;
}