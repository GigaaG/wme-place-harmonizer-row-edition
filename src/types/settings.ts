import type { DataChannel } from "../constants/app";

export const GOOGLE_MAPS_VALIDATION_CHECK_KEYS = [
  "notFound",
  "closed",
  "locationDrift",
  "nameMismatch",
  "category",
  "openingHours"
] as const;

export type GoogleMapsValidationCheckKey =
  (typeof GOOGLE_MAPS_VALIDATION_CHECK_KEYS)[number];

export interface GoogleMapsValidationChecks {
  notFound: boolean;
  closed: boolean;
  locationDrift: boolean;
  nameMismatch: boolean;
  category: boolean;
  openingHours: boolean;
}

export interface GoogleMapsValidationSettings {
  enabled: boolean;
  checks: GoogleMapsValidationChecks;
}

export interface UserSettings {
  dataChannel: DataChannel;
  debugEnabled: boolean;
  fallbackCountry?: string;
  autoScanVisibleVenues: boolean;
  googleMapsValidation: GoogleMapsValidationSettings;
}
