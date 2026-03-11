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

  services?: string[];

  openingHours?: OpeningHourDefinition[];
  externalProviderIds?: string[];

  country?: string;
}