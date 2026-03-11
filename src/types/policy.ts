import type { GeometryPolicy, ServicePolicy } from "./chains";

export interface EffectivePlacePolicy {
  geometry?: GeometryPolicy;
  lockLevel?: number;
  requirePhone?: boolean;
  requireUrl?: boolean;
  requireOpeningHours?: boolean;
  requireExternalProvider?: boolean;
  services?: ServicePolicy;
}