import type { GeometryPolicy, ServicePolicy } from "./chains";
import type { AddressPolicy, PresenceRequirement } from "./address";
import type { LocalizedTextList } from "./i18n";

export interface EffectivePlacePolicy {
  geometry?: GeometryPolicy;
  lockLevel?: number;
  cityInVenueName?: boolean;
  phone?: PresenceRequirement;
  url?: PresenceRequirement;
  openingHours?: PresenceRequirement;
  navigationPoints?: PresenceRequirement;
  externalProviderIds?: PresenceRequirement;
  services?: ServicePolicy;
  address?: AddressPolicy;
  editorNotes?: LocalizedTextList;
}
