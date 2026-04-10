import { logger } from "../../logging/logger.ts";
import { normalizeCategoryKeys } from "../../config/category-key.ts";
import { normalizeText } from "../../matching/normalize.ts";
import type { PlaceIssue } from "../../types/issue.ts";
import type { PlaceProposal } from "../../types/proposal.ts";
import type { ExternalProviderSuggestion } from "../../types/external-provider.ts";
import { findExternalProviderEditorCandidates } from "./external-provider-editor.ts";
import { t } from "../../i18n/runtime.ts";

const MAX_EXTERNAL_PROVIDER_SUGGESTIONS = 5;
const MIN_NAME_SCORE = 0.55;
// Keep Google suggestions tightly local so nearby-name matches from other cities
// do not surface as proposals for venues without an external provider.
const MAX_SUGGESTION_DISTANCE_METERS = 300;
const ABSOLUTE_MAX_SUGGESTION_DISTANCE_METERS = 300;

interface SearchOrigin {
  lon: number;
  lat: number;
}

export interface ExternalProviderCandidate {
  providerId?: string;
  name?: string;
  address?: string;
  location?: SearchOrigin;
  sortIndex?: number;
}

function tokenizeAddress(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length >= 2);
}

export function filterEditorCandidatesByVenueAddress(
  venueAddress: { city?: string } | undefined,
  candidates: ExternalProviderCandidate[]
): ExternalProviderCandidate[] {
  if (candidates.length === 0) {
    return candidates;
  }

  const cityTokens = tokenizeAddress(venueAddress?.city);

  if (cityTokens.length === 0) {
    return candidates;
  }

  const filtered = candidates.filter((candidate) => {
    const localityTokens = new Set([
      ...tokenizeAddress(candidate.name),
      ...tokenizeAddress(candidate.address)
    ]);

    if (localityTokens.size === 0) {
      return false;
    }

    return cityTokens.every((token) => localityTokens.has(token));
  });

  return filtered.length > 0 ? filtered : candidates;
}

// Uses the legacy PlacesService nearbySearch `type` filter, so values must be
// valid Google Maps JavaScript place-search types.
export const CATEGORY_GOOGLE_PLACE_TYPE_MAP: Record<string, readonly string[]> = {
  CAR_SERVICES: ["car_repair", "car_wash", "gas_station"],
  CRISIS_LOCATIONS: ["lodging", "local_government_office"],
  CULTURE_AND_ENTERTAINEMENT: [
    "tourist_attraction",
    "museum",
    "movie_theater",
    "art_gallery",
    "night_club",
    "stadium",
    "amusement_park",
    "zoo",
    "aquarium",
    "casino"
  ],
  FOOD_AND_DRINK: ["restaurant", "cafe", "bar", "bakery"],
  LODGING: ["lodging", "campground", "rv_park"],
  NATURAL_FEATURES: ["park", "tourist_attraction"],
  OTHER: [],
  OUTDOORS: ["park", "tourist_attraction", "stadium"],
  PARKING_LOT: ["parking"],
  PROFESSIONAL_AND_PUBLIC: [
    "school",
    "university",
    "hospital",
    "library",
    "city_hall",
    "courthouse",
    "fire_station",
    "police",
    "post_office",
    "embassy",
    "local_government_office",
    "cemetery"
  ],
  SHOPPING_AND_SERVICES: [
    "store",
    "supermarket",
    "shopping_mall",
    "bank",
    "atm",
    "pharmacy"
  ],
  TRANSPORTATION: [
    "airport",
    "bus_station",
    "train_station",
    "subway_station",
    "transit_station",
    "taxi_stand",
    "parking"
  ],
  CAR_WASH: ["car_wash"],
  CHARGING_STATION: [],
  GARAGE_AUTOMOTIVE_SHOP: ["car_repair"],
  GAS_STATION: ["gas_station"],
  DONATION_CENTERS: [],
  SHELTER_LOCATIONS: ["lodging"],
  ART_GALLERY: ["art_gallery"],
  CASINO: ["casino"],
  CLUB: ["night_club"],
  TOURIST_ATTRACTION_HISTORIC_SITE: ["tourist_attraction"],
  MOVIE_THEATER: ["movie_theater"],
  MUSEUM: ["museum"],
  MUSIC_VENUE: ["night_club", "stadium"],
  PERFORMING_ARTS_VENUE: ["tourist_attraction", "movie_theater"],
  GAME_CLUB: ["bowling_alley", "night_club"],
  STADIUM_ARENA: ["stadium"],
  THEME_PARK: ["amusement_park"],
  ZOO_AQUARIUM: ["zoo", "aquarium"],
  RACING_TRACK: ["stadium"],
  THEATER: ["movie_theater", "tourist_attraction"],
  RESTAURANT: ["restaurant"],
  BAKERY: ["bakery"],
  DESSERT: ["bakery", "cafe"],
  CAFE: ["cafe"],
  FAST_FOOD: ["restaurant", "meal_takeaway"],
  FOOD_COURT: ["restaurant", "meal_takeaway"],
  BAR: ["bar"],
  ICE_CREAM: ["cafe", "bakery"],
  HOTEL: ["lodging"],
  HOSTEL: ["lodging"],
  CAMPING_TRAILER_PARK: ["campground", "rv_park"],
  COTTAGE_CABIN: ["lodging"],
  BED_AND_BREAKFAST: ["lodging"],
  ISLAND: ["tourist_attraction", "park"],
  SEA_LAKE_POOL: ["tourist_attraction", "park"],
  RIVER_STREAM: ["tourist_attraction", "park"],
  FOREST_GROVE: ["park"],
  FARM: ["tourist_attraction"],
  CANAL: ["tourist_attraction", "park"],
  SWAMP_MARSH: ["tourist_attraction", "park"],
  DAM: ["tourist_attraction"],
  CONSTRUCTION_SITE: [],
  PARK: ["park"],
  PLAYGROUND: ["park"],
  BEACH: ["tourist_attraction", "park"],
  SPORTS_COURT: ["stadium"],
  GOLF_COURSE: ["park", "stadium"],
  PLAZA: ["tourist_attraction", "park"],
  PROMENADE: ["tourist_attraction", "park"],
  POOL: ["gym", "park"],
  SCENIC_LOOKOUT_VIEWPOINT: ["tourist_attraction", "park"],
  SKI_AREA: ["tourist_attraction", "park"],
  COLLEGE_UNIVERSITY: ["university"],
  SCHOOL: ["school"],
  CONVENTIONS_EVENT_CENTER: ["stadium", "tourist_attraction"],
  GOVERNMENT: ["local_government_office"],
  LIBRARY: ["library"],
  CITY_HALL: ["city_hall"],
  ORGANIZATION_OR_ASSOCIATION: [],
  PRISON_CORRECTIONAL_FACILITY: [],
  COURTHOUSE: ["courthouse"],
  CEMETERY: ["cemetery"],
  FIRE_DEPARTMENT: ["fire_station"],
  POLICE_STATION: ["police"],
  MILITARY: [],
  HOSPITAL_URGENT_CARE: ["hospital"],
  DOCTOR_CLINIC: ["doctor"],
  OFFICES: [],
  POST_OFFICE: ["post_office"],
  RELIGIOUS_CENTER: ["church", "mosque", "synagogue", "hindu_temple"],
  KINDERGARDEN: ["primary_school", "school"],
  FACTORY_INDUSTRIAL: [],
  EMBASSY_CONSULATE: ["embassy"],
  INFORMATION_POINT: ["tourist_attraction"],
  EMERGENCY_SHELTER: ["lodging"],
  TRASH_AND_RECYCLING_FACILITIES: [],
  ARTS_AND_CRAFTS: ["store"],
  BANK_FINANCIAL: ["bank"],
  SPORTING_GOODS: ["store"],
  BOOKSTORE: ["book_store"],
  PHOTOGRAPHY: ["store"],
  CAR_DEALERSHIP: ["car_dealer"],
  FASHION_AND_CLOTHING: ["clothing_store"],
  CONVENIENCE_STORE: ["convenience_store"],
  PERSONAL_CARE: ["beauty_salon", "hair_care", "spa"],
  DEPARTMENT_STORE: ["department_store"],
  PHARMACY: ["pharmacy"],
  ELECTRONICS: ["electronics_store"],
  FLOWERS: ["florist"],
  FURNITURE_HOME_STORE: ["furniture_store", "home_goods_store"],
  GIFTS: ["store"],
  GYM_FITNESS: ["gym"],
  SWIMMING_POOL: ["gym", "park"],
  HARDWARE_STORE: ["hardware_store"],
  MARKET: ["supermarket", "store"],
  SUPERMARKET_GROCERY: ["supermarket"],
  JEWELRY: ["jewelry_store"],
  LAUNDRY_DRY_CLEAN: ["laundry"],
  SHOPPING_CENTER: ["shopping_mall"],
  MUSIC_STORE: ["store"],
  PET_STORE_VETERINARIAN_SERVICES: ["pet_store", "veterinary_care"],
  TOY_STORE: ["store"],
  TRAVEL_AGENCY: ["travel_agency"],
  ATM: ["atm"],
  CURRENCY_EXCHANGE: ["bank", "atm"],
  CAR_RENTAL: ["car_rental"],
  TELECOM: ["store"],
  AIRPORT: ["airport"],
  BUS_STATION: ["bus_station"],
  FERRY_PIER: ["transit_station"],
  SEAPORT_MARINA_HARBOR: ["tourist_attraction", "transit_station"],
  SUBWAY_STATION: ["subway_station"],
  TRAIN_STATION: ["train_station"],
  BRIDGE: ["tourist_attraction"],
  TUNNEL: [],
  TAXI_STATION: ["taxi_stand"],
  JUNCTION_INTERCHANGE: [],
  REST_AREAS: ["parking"],
  CARPOOL_SPOT: ["parking"],
  RESIDENTIAL: [],
  FOREST: ["park"],
  HOSPITAL_MEDICAL_CARE: ["hospital"],
  UNIVERSITY: ["university"]
};

// Validation can accept a broader set of Google Place details types than
// nearbySearch supports as a `type` filter. Keep search strict and validation
// tolerant so linked-place checks do not over-report on Google's coarse typing.
export const CATEGORY_GOOGLE_VALIDATION_TYPE_MAP: Record<string, readonly string[]> = {
  ...CATEGORY_GOOGLE_PLACE_TYPE_MAP,
  FOOD_AND_DRINK: ["restaurant", "cafe", "bar", "bakery", "meal_takeaway", "meal_delivery", "food"],
  SHOPPING_AND_SERVICES: ["store", "supermarket", "shopping_mall", "bank", "atm", "pharmacy", "convenience_store", "department_store"],
  TRANSPORTATION: ["airport", "bus_station", "train_station", "subway_station", "transit_station", "taxi_stand", "parking"],
  FAST_FOOD: ["restaurant", "meal_takeaway", "meal_delivery", "cafe", "food"],
  FOOD_COURT: ["restaurant", "meal_takeaway", "meal_delivery", "cafe", "food"],
  CAFE: ["cafe", "restaurant", "bakery", "food"],
  RESTAURANT: ["restaurant", "meal_takeaway", "meal_delivery", "food"],
  BAKERY: ["bakery", "cafe", "food", "store"],
  DESSERT: ["bakery", "cafe", "food", "store"],
  BAR: ["bar", "restaurant", "food"],
  ICE_CREAM: ["cafe", "bakery", "food", "store"],
  MARKET: ["supermarket", "store", "grocery_or_supermarket"],
  SUPERMARKET_GROCERY: ["supermarket", "grocery_or_supermarket", "store"],
  CONVENIENCE_STORE: ["convenience_store", "store", "food"],
  DEPARTMENT_STORE: ["department_store", "store", "shopping_mall"],
  BOOKSTORE: ["book_store", "store"],
  FASHION_AND_CLOTHING: ["clothing_store", "store"],
  ELECTRONICS: ["electronics_store", "store"],
  FURNITURE_HOME_STORE: ["furniture_store", "home_goods_store", "store"],
  HARDWARE_STORE: ["hardware_store", "store"],
  JEWELRY: ["jewelry_store", "store"],
  MUSIC_STORE: ["store"],
  TOY_STORE: ["store"],
  GIFTS: ["store"],
  ARTS_AND_CRAFTS: ["store"],
  PHOTOGRAPHY: ["store"],
  SPORTING_GOODS: ["store"],
  TELECOM: ["store"],
  PERSONAL_CARE: ["beauty_salon", "hair_care", "spa", "store"],
  LAUNDRY_DRY_CLEAN: ["laundry", "store"],
  PET_STORE_VETERINARIAN_SERVICES: ["pet_store", "veterinary_care", "store"],
  GYM_FITNESS: ["gym", "health", "spa"],
  SWIMMING_POOL: ["gym", "park", "sports_complex"],
  TRAIN_STATION: ["train_station", "transit_station"],
  SUBWAY_STATION: ["subway_station", "transit_station"],
  BUS_STATION: ["bus_station", "transit_station"],
  FERRY_PIER: ["transit_station"],
  SEAPORT_MARINA_HARBOR: ["transit_station", "tourist_attraction"],
  TAXI_STATION: ["taxi_stand", "transit_station"],
  PARK: ["park", "tourist_attraction"],
  PLAYGROUND: ["park"],
  BEACH: ["tourist_attraction", "park"],
  PLAZA: ["tourist_attraction", "park"],
  PROMENADE: ["tourist_attraction", "park"],
  SCENIC_LOOKOUT_VIEWPOINT: ["tourist_attraction", "park"],
  TOURIST_ATTRACTION_HISTORIC_SITE: ["tourist_attraction", "museum"],
  PERFORMING_ARTS_VENUE: ["tourist_attraction", "movie_theater", "stadium"],
  MUSIC_VENUE: ["night_club", "stadium", "bar"],
  STADIUM_ARENA: ["stadium", "sports_complex"],
  CONVENTIONS_EVENT_CENTER: ["stadium", "tourist_attraction"],
  HOTEL: ["lodging"],
  HOSTEL: ["lodging"],
  BED_AND_BREAKFAST: ["lodging"],
  CAMPING_TRAILER_PARK: ["campground", "rv_park", "lodging"],
  COTTAGE_CABIN: ["lodging"],
  DOCTOR_CLINIC: ["doctor", "hospital", "health"],
  HOSPITAL_URGENT_CARE: ["hospital", "doctor", "health"],
  HOSPITAL_MEDICAL_CARE: ["hospital", "doctor", "health"],
  KINDERGARDEN: ["primary_school", "school"],
  COLLEGE_UNIVERSITY: ["university", "school"],
  RELIGIOUS_CENTER: ["church", "mosque", "synagogue", "hindu_temple"]
};

let placesServiceContainer: HTMLDivElement | null = null;

function getGoogleHostWindow(): Window & { google?: any } {
  try {
    if (typeof unsafeWindow !== "undefined") {
      return unsafeWindow as Window & { google?: any };
    }
  } catch {
    // ignore
  }

  return window as Window & { google?: any };
}

function getGoogleMapsApi(): any | null {
  const googleMaps = getGoogleHostWindow().google?.maps;

  if (!googleMaps?.places?.PlacesService) {
    return null;
  }

  return googleMaps;
}

function ensurePlacesServiceContainer(): HTMLDivElement | null {
  if (typeof document === "undefined" || !document.body) {
    return null;
  }

  if (placesServiceContainer) {
    return placesServiceContainer;
  }

  placesServiceContainer = document.createElement("div");
  placesServiceContainer.style.display = "none";
  document.body.appendChild(placesServiceContainer);

  return placesServiceContainer;
}

function collectLonLatPairs(value: unknown, points: number[][] = []): number[][] {
  if (!Array.isArray(value)) {
    return points;
  }

  if (
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    points.push([value[0], value[1]]);
    return points;
  }

  for (const nestedValue of value) {
    collectLonLatPairs(nestedValue, points);
  }

  return points;
}

function getVenueSearchOrigin(venue: any): SearchOrigin | undefined {
  const geometry = venue?.geometry;

  if (!geometry) {
    return undefined;
  }

  if (
    (geometry.type === "Point" || geometry.type === "point") &&
    Array.isArray(geometry.coordinates)
  ) {
    const [lon, lat] = geometry.coordinates;

    if (typeof lon === "number" && typeof lat === "number") {
      return { lon, lat };
    }
  }

  const points = collectLonLatPairs(geometry.coordinates);

  if (points.length === 0) {
    return undefined;
  }

  let minLon = Number.POSITIVE_INFINITY;
  let maxLon = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const [lon, lat] of points) {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }

  return {
    lon: (minLon + maxLon) / 2,
    lat: (minLat + maxLat) / 2
  };
}

function readLocation(location: unknown): SearchOrigin | undefined {
  if (!location || typeof location !== "object") {
    return undefined;
  }

  const typedLocation = location as Record<string, unknown>;
  const rawLat =
    typeof typedLocation.lat === "function"
      ? typedLocation.lat()
      : typedLocation.lat;
  const rawLng =
    typeof typedLocation.lng === "function"
      ? typedLocation.lng()
      : typedLocation.lng;

  if (typeof rawLat !== "number" || typeof rawLng !== "number") {
    return undefined;
  }

  return {
    lon: rawLng,
    lat: rawLat
  };
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function calculateDistanceMeters(origin: SearchOrigin, target: SearchOrigin): number {
  const earthRadius = 6371000;
  const deltaLat = toRadians(target.lat - origin.lat);
  const deltaLon = toRadians(target.lon - origin.lon);
  const originLat = toRadians(origin.lat);
  const targetLat = toRadians(target.lat);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(originLat) *
      Math.cos(targetLat) *
      Math.sin(deltaLon / 2) ** 2;

  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function tokenize(value: string): string[] {
  return Array.from(
    new Set(
      normalizeText(value)
        .split(" ")
        .filter((token) => token.length > 0)
    )
  );
}

function compactNormalizedName(value: string): string {
  return normalizeText(value)
    .replace(/ /g, "")
    .replace(/'/g, "");
}

export function scoreExternalProviderName(
  query: string,
  candidateName: string
): number {
  const normalizedQuery = normalizeText(query);
  const normalizedCandidate = normalizeText(candidateName);
  const compactQuery = compactNormalizedName(query);
  const compactCandidate = compactNormalizedName(candidateName);

  if (!normalizedQuery || !normalizedCandidate) {
    return 0;
  }

  if (
    normalizedQuery === normalizedCandidate ||
    compactQuery === compactCandidate
  ) {
    return 1;
  }

  if (
    normalizedCandidate.startsWith(normalizedQuery) ||
    normalizedQuery.startsWith(normalizedCandidate)
  ) {
    return 0.92;
  }

  if (
    normalizedCandidate.includes(normalizedQuery) ||
    normalizedQuery.includes(normalizedCandidate)
  ) {
    return 0.84;
  }

  const queryTokens = tokenize(normalizedQuery);
  const candidateTokens = tokenize(normalizedCandidate);

  if (queryTokens.length === 0 || candidateTokens.length === 0) {
    return 0;
  }

  const sharedTokenCount = queryTokens.filter((token) =>
    candidateTokens.includes(token)
  ).length;

  if (sharedTokenCount === 0) {
    return 0;
  }

  const queryCoverage = sharedTokenCount / queryTokens.length;
  const candidateCoverage = sharedTokenCount / candidateTokens.length;

  return Math.min(0.89, queryCoverage * 0.7 + candidateCoverage * 0.2 + 0.1);
}

export function rankExternalProviderSuggestions(
  query: string,
  origin: SearchOrigin,
  candidates: ExternalProviderCandidate[]
): ExternalProviderSuggestion[] {
  const seenProviderIds = new Set<string>();
  const suggestions: ExternalProviderSuggestion[] = [];

  for (const candidate of candidates) {
    const providerId =
      typeof candidate.providerId === "string" ? candidate.providerId.trim() : "";
    const name = typeof candidate.name === "string" ? candidate.name.trim() : "";

    if (!providerId || !name || seenProviderIds.has(providerId)) {
      continue;
    }

    const nameScore = scoreExternalProviderName(query, name);

    if (nameScore < MIN_NAME_SCORE) {
      continue;
    }

    const distanceMeters = candidate.location
      ? calculateDistanceMeters(origin, candidate.location)
      : undefined;

    if (
      typeof distanceMeters === "number" &&
      distanceMeters > ABSOLUTE_MAX_SUGGESTION_DISTANCE_METERS
    ) {
      continue;
    }

    if (
      typeof distanceMeters === "number" &&
      distanceMeters > MAX_SUGGESTION_DISTANCE_METERS &&
      nameScore < 0.84
    ) {
      continue;
    }

    seenProviderIds.add(providerId);
    suggestions.push({
      providerId,
      name,
      address: candidate.address,
      distanceMeters,
      nameScore,
      sortIndex: candidate.sortIndex
    });
  }

  return suggestions
    .sort((left, right) => {
      if (right.nameScore !== left.nameScore) {
        return right.nameScore - left.nameScore;
      }

      if (
        typeof left.distanceMeters === "number" &&
        typeof right.distanceMeters === "number" &&
        left.distanceMeters !== right.distanceMeters
      ) {
        return left.distanceMeters - right.distanceMeters;
      }

      if (typeof left.distanceMeters === "number") {
        return -1;
      }

      if (typeof right.distanceMeters === "number") {
        return 1;
      }

      if (
        typeof left.sortIndex === "number" &&
        typeof right.sortIndex === "number" &&
        left.sortIndex !== right.sortIndex
      ) {
        return left.sortIndex - right.sortIndex;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, MAX_EXTERNAL_PROVIDER_SUGGESTIONS);
}

function mapGoogleCandidate(result: any): ExternalProviderCandidate | undefined {
  const providerId =
    typeof result?.place_id === "string" ? result.place_id.trim() : "";
  const name = typeof result?.name === "string" ? result.name.trim() : "";

  if (!providerId || !name) {
    return undefined;
  }

  const addressCandidates = [result?.vicinity, result?.formatted_address];
  const address = addressCandidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim().length > 0
  ) as string | undefined;

  return {
    providerId,
    name,
    address,
    location: readLocation(result?.geometry?.location)
  };
}

function isSuccessfulPlacesStatus(status: unknown, googleMaps: any): boolean {
  const placesStatus = googleMaps?.places?.PlacesServiceStatus;

  return (
    status === "OK" ||
    status === placesStatus?.OK ||
    status === "ZERO_RESULTS" ||
    status === placesStatus?.ZERO_RESULTS
  );
}

function runNearbySearch(
  service: any,
  googleMaps: any,
  request: Record<string, unknown>
): Promise<any[]> {
  return new Promise((resolve) => {
    service.nearbySearch(request, (results: any[], status: unknown) => {
      if (!isSuccessfulPlacesStatus(status, googleMaps)) {
        logger.warn(`External provider nearbySearch failed: ${String(status)}`);
        resolve([]);
        return;
      }

      resolve(Array.isArray(results) ? results : []);
    });
  });
}

export function resolveNearbySearchTypes(venue: any): string[] {
  const categories = normalizeCategoryKeys(venue?.categories ?? []);
  const seen = new Set<string>();
  const placeTypes: string[] = [];

  for (const category of categories) {
    const placeTypesForCategory = CATEGORY_GOOGLE_PLACE_TYPE_MAP[category] ?? [];

    for (const placeType of placeTypesForCategory) {
      if (seen.has(placeType)) {
        continue;
      }

      seen.add(placeType);
      placeTypes.push(placeType);
    }
  }

  return placeTypes;
}

async function runCategoryTypedNearbySearch(params: {
  service: any;
  googleMaps: any;
  origin: SearchOrigin;
  venue: any;
}): Promise<ExternalProviderCandidate[]> {
  const { service, googleMaps, origin, venue } = params;
  const searchTypes = resolveNearbySearchTypes(venue);

  if (searchTypes.length === 0) {
    return [];
  }

  const location = new googleMaps.LatLng(origin.lat, origin.lon);
  const candidates: ExternalProviderCandidate[] = [];
  const seenProviderIds = new Set<string>();

  for (const searchType of searchTypes) {
    const request: Record<string, unknown> = {
      location,
      type: searchType
    };

    if (googleMaps.places?.RankBy?.DISTANCE !== undefined) {
      request.rankBy = googleMaps.places.RankBy.DISTANCE;
    } else {
      request.radius = MAX_SUGGESTION_DISTANCE_METERS;
    }

    const results = await runNearbySearch(service, googleMaps, request);

    for (const result of results) {
      const candidate = mapGoogleCandidate(result);

      if (!candidate?.providerId || seenProviderIds.has(candidate.providerId)) {
        continue;
      }

      seenProviderIds.add(candidate.providerId);
      candidates.push(candidate);
    }
  }

  return candidates;
}

function runTextSearch(
  service: any,
  googleMaps: any,
  request: Record<string, unknown>
): Promise<any[]> {
  return new Promise((resolve) => {
    if (typeof service.textSearch !== "function") {
      resolve([]);
      return;
    }

    service.textSearch(request, (results: any[], status: unknown) => {
      if (!isSuccessfulPlacesStatus(status, googleMaps)) {
        logger.warn(`External provider textSearch failed: ${String(status)}`);
        resolve([]);
        return;
      }

      resolve(Array.isArray(results) ? results : []);
    });
  });
}

export async function findSuggestedExternalProviders(
  venue: any,
  query: string,
  options?: {
    venueAddress?: { city?: string };
  }
): Promise<ExternalProviderSuggestion[]> {
  const searchQuery = query.trim();

  if (!searchQuery) {
    return [];
  }

  if (typeof window === "undefined") {
    return [];
  }

  const origin = getVenueSearchOrigin(venue);

  if (!origin) {
    logger.info("Venue geometry unavailable; skipping external provider suggestions");
    return [];
  }

  const googleMaps = getGoogleMapsApi();

  if (googleMaps) {
    const container = ensurePlacesServiceContainer();

    if (container) {
      const service = new googleMaps.places.PlacesService(container);
      const typedNearbyCandidates = await runCategoryTypedNearbySearch({
        service,
        googleMaps,
        origin,
        venue
      });
      const typedNearbySuggestions = rankExternalProviderSuggestions(
        searchQuery,
        origin,
        typedNearbyCandidates
      );

      if (typedNearbySuggestions.length > 0) {
        logger.info(
          `Found ${typedNearbySuggestions.length} category-typed nearby external provider suggestion(s)`
        );
        return typedNearbySuggestions;
      }

      const location = new googleMaps.LatLng(origin.lat, origin.lon);
      const nearbySearchRequest: Record<string, unknown> = {
        keyword: searchQuery,
        location
      };

      if (googleMaps.places?.RankBy?.DISTANCE !== undefined) {
        nearbySearchRequest.rankBy = googleMaps.places.RankBy.DISTANCE;
      } else {
        nearbySearchRequest.radius = MAX_SUGGESTION_DISTANCE_METERS;
      }

      const nearbyResults = await runNearbySearch(
        service,
        googleMaps,
        nearbySearchRequest
      );
      const nearbyCandidates = nearbyResults
        .map((result) => mapGoogleCandidate(result))
        .filter((candidate): candidate is ExternalProviderCandidate => candidate !== undefined);
      const nearbySuggestions = rankExternalProviderSuggestions(
        searchQuery,
        origin,
        nearbyCandidates
      );

      if (nearbySuggestions.length > 0) {
        return nearbySuggestions;
      }

      const textResults = await runTextSearch(service, googleMaps, {
        query: searchQuery,
        location,
        radius: MAX_SUGGESTION_DISTANCE_METERS
      });
      const textCandidates = textResults
        .map((result) => mapGoogleCandidate(result))
        .filter((candidate): candidate is ExternalProviderCandidate => candidate !== undefined);
      const textSuggestions = rankExternalProviderSuggestions(
        searchQuery,
        origin,
        textCandidates
      );

      if (textSuggestions.length > 0) {
        return textSuggestions;
      }
    } else {
      logger.warn("Cannot initialize Google Places container for external provider suggestions");
    }
  } else {
    logger.info("Google Places service unavailable on host window; falling back to editor autocomplete suggestions");
  }

  const editorCandidates = filterEditorCandidatesByVenueAddress(
    options?.venueAddress,
    await findExternalProviderEditorCandidates(searchQuery)
  );
  return rankExternalProviderSuggestions(
    searchQuery,
    origin,
    editorCandidates
  );
}

function buildSuggestionReason(suggestion: ExternalProviderSuggestion): string {
  const details: string[] = [];

  if (suggestion.address) {
    details.push(suggestion.address);
  }

  if (typeof suggestion.distanceMeters === "number") {
    details.push(
      t("proposal.externalProvider.reason.distanceAway", {
        distanceMeters: suggestion.distanceMeters
      })
    );
  }

  return details.length > 0
    ? details.join(" | ")
    : t("proposal.externalProvider.reason.nearbyName");
}

function buildSearchProposalId(issue: PlaceIssue, suffix: string): string {
  return `${issue.ruleId ?? issue.field}:external-provider:${suffix}`;
}

function buildExternalProviderSuggestionGroupKey(issue: PlaceIssue): string {
  return issue.groupKey ?? `${issue.field}::${issue.ruleId ?? issue.message}`;
}

export function buildGoogleMapsPlaceUrl(
  suggestion: ExternalProviderSuggestion
): string {
  const params = new URLSearchParams({
    api: "1",
    query: suggestion.address
      ? `${suggestion.name} ${suggestion.address}`
      : suggestion.name
  });

  if (suggestion.providerId) {
    params.set("query_place_id", suggestion.providerId);
  }

  return `https://www.google.com/maps/search/?${params.toString()}`;
}

export function buildExternalProviderSuggestionProposals(
  issue: PlaceIssue,
  suggestions: ExternalProviderSuggestion[],
  currentExternalProviderIds: string[] = []
): PlaceProposal[] {
  return suggestions.map((suggestion) => {
    const mergedProviderIds = Array.from(
      new Set([...currentExternalProviderIds, suggestion.providerId])
    );

    return {
      id: buildSearchProposalId(issue, suggestion.providerId),
      field: issue.field,
      groupKey: buildExternalProviderSuggestionGroupKey(issue),
      currentValue: currentExternalProviderIds,
      proposedValue: mergedProviderIds,
      displayCurrentValue:
        currentExternalProviderIds.length > 0
          ? currentExternalProviderIds.join(", ")
          : t("common.missing"),
      displayProposedValue:
        typeof suggestion.distanceMeters === "number"
          ? t("proposal.externalProvider.displayWithDistance", {
              name: suggestion.name,
              distanceMeters: suggestion.distanceMeters
            })
          : suggestion.name,
      displayProposedValueUrl: buildGoogleMapsPlaceUrl(suggestion),
      externalProviderSearchText: suggestion.address
        ? `${suggestion.name}, ${suggestion.address}`
        : suggestion.name,
      externalProviderTargetId: suggestion.providerId,
      externalProviderTargetName: suggestion.name,
      externalProviderTargetAddress: suggestion.address,
      reason: buildSuggestionReason(suggestion),
      issueRuleId: issue.ruleId,
      isApplySupported: true,
      actionType: "set-field"
    };
  });
}

export function buildSuggestedExternalProviderIssueMessage(
  issue: PlaceIssue,
  suggestion?: ExternalProviderSuggestion
): string {
  if (!suggestion) {
    return issue.message;
  }

  const details = [suggestion.name];

  if (suggestion.address) {
    details.push(suggestion.address);
  }

  return t("issue.externalProvider.suggestedNearbyMatch", {
    issueMessage: issue.message,
    details: details.join(" | ")
  });
}
