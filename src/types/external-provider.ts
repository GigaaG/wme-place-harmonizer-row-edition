export interface ExternalProviderSuggestion {
  providerId: string;
  name: string;
  address?: string;
  distanceMeters?: number;
  nameScore: number;
  sortIndex?: number;
}
