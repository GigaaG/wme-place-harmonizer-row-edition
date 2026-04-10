export type PresenceRequirement =
  | "required"
  | "recommended"
  | "optional"
  | "discouraged"
  | "forbidden";

export type EnforcedPresenceRequirement = Exclude<
  PresenceRequirement,
  "optional"
>;

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
