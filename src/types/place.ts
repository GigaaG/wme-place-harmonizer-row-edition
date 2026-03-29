import type { PlaceAddress } from "./address";

export type GeometryType = "point" | "polygon";

export interface OpeningHourDefinition {
  days: number[];
  fromHour: string;
  toHour: string;
}

export interface PlaceLike {
  name: string;
  categories?: string[];
  brand?: string;
  aliases?: string[];

  phone?: string;
  url?: string;

  geometry?: GeometryType;
  lockLevel?: number;

  services?: string[];

  openingHours?: OpeningHourDefinition[];
  navigationPointCount?: number;
  externalProviderIds?: string[];
  address?: PlaceAddress;

  country?: string;
}
