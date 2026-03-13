import type { GeometryPolicy, ServicePolicy } from "./chains";
import type { AddressPolicy, PresenceRequirement } from "./address";

export interface EffectivePlacePolicy {
  geometry?: GeometryPolicy;
  lockLevel?: number;
  phone?: PresenceRequirement;
  url?: PresenceRequirement;
  openingHours?: PresenceRequirement;
  externalProviderIds?: PresenceRequirement;
  services?: ServicePolicy;
  address?: AddressPolicy;
}
