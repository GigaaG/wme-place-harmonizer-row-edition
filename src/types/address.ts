export type AddressFieldRequirement =
  | "required"
  | "recommended"
  | "discouraged"
  | "forbidden";

export interface AddressPolicy {
  city?: AddressFieldRequirement;
  street?: AddressFieldRequirement;
  houseNumber?: AddressFieldRequirement;
}

export interface PlaceAddress {
  city?: string;
  street?: string;
  houseNumber?: string;
}
