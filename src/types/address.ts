export type PresenceRequirement =
  | "required"
  | "recommended"
  | "discouraged"
  | "forbidden";

export type AddressFieldRequirement = PresenceRequirement;

export interface AddressPolicy {
  city?: PresenceRequirement;
  street?: PresenceRequirement;
  houseNumber?: PresenceRequirement;
}

export interface PlaceAddress {
  city?: string;
  street?: string;
  houseNumber?: string;
}
