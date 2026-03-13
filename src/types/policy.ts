import type { GeometryPolicy, ServicePolicy } from "./chains";
import type { AddressPolicy, PresenceRequirement } from "./address";

export interface EffectivePlacePolicy {
  geometry?: GeometryPolicy;
  lockLevel?: number;
  cityInVenueName?: boolean;
  phone?: PresenceRequirement;
  url?: PresenceRequirement;
  openingHours?: PresenceRequirement;
  externalProviderIds?: PresenceRequirement;
  services?: ServicePolicy;
  address?: AddressPolicy;
  editorNotes?: string[];
}
