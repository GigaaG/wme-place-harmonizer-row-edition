import type { GoogleMapsValidationConfig } from "../../types/config.ts";
import type { PlaceIssue } from "../../types/issue.ts";
import type { PlaceProposal } from "../../types/proposal.ts";
import type { OpeningHourDefinition } from "../../types/place.ts";
import type { GoogleMapsValidationSettings } from "../../types/settings.ts";

export interface SearchOrigin {
  lon: number;
  lat: number;
}

export interface LinkedExternalProviderValidationParams {
  venueName: string;
  externalProviderIds: string[];
  venue?: any;
  currentCategories?: string[];
  currentOpeningHours?: OpeningHourDefinition[];
  settings?: GoogleMapsValidationSettings;
  config?: GoogleMapsValidationConfig;
}

export interface ExternalProviderValidationSnapshot {
  providerId: string;
  venueName: string;
  placeName?: string;
  address?: string;
  url?: string;
  businessStatus?: string;
  distanceMeters?: number;
  notFound?: boolean;
  currentCategories?: string[];
  googleTypes?: string[];
  currentOpeningHours?: OpeningHourDefinition[];
  googleOpeningHours?: string[];
  googleOpeningHoursValue?: OpeningHourDefinition[];
  googleOpeningHoursDisplay?: string;
}

export interface ExternalProviderValidationFinding {
  issue: PlaceIssue;
  proposal: PlaceProposal;
}
