import type { GeometryPolicy, ServicePolicy } from "./chains";
import type { AddressPolicy } from "./address";

export interface EffectivePlacePolicy {
  geometry?: GeometryPolicy;
  lockLevel?: number;
  requirePhone?: boolean;
  requireUrl?: boolean;
  requireOpeningHours?: boolean;
  requireExternalProvider?: boolean;
  services?: ServicePolicy;
  address?: AddressPolicy;
}
