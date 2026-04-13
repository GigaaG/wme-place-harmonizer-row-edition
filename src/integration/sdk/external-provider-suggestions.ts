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
const MIN_MOVED_FALLBACK_NAME_SCORE = 0.84;
// Keep suggestions local enough to avoid cross-city matches, but wide enough to
// still catch the correct provider for venues whose centroid is not right on top
// of the Google Place.
const MAX_SUGGESTION_DISTANCE_METERS = 500;
const MOVED_FALLBACK_DISTANCE_METERS = 15000;

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

interface CategoryGoogleTypeRule {
  search?: readonly string[];
  validation?: readonly string[];
}

function rule(
  search: readonly string[],
  validation?: readonly string[]
): CategoryGoogleTypeRule {
  return validation ? { search, validation } : { search };
}

const CATEGORY_GOOGLE_TYPE_RULES: Record<string, CategoryGoogleTypeRule> = {
  CAR_SERVICES: rule(["car_repair", "car_wash", "gas_station"]),
  CRISIS_LOCATIONS: rule(["lodging", "local_government_office"]),
  CULTURE_AND_ENTERTAINEMENT: rule([
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
  ]),
  FOOD_AND_DRINK: rule(["restaurant", "cafe", "bar", "bakery"], ["restaurant", "cafe", "bar", "bakery", "meal_takeaway", "meal_delivery", "food"]),
  LODGING: rule(["lodging", "campground", "rv_park"]),
  NATURAL_FEATURES: rule(["park", "tourist_attraction"]),
  OTHER: rule([]),
  OUTDOORS: rule(["park", "tourist_attraction", "stadium"]),
  PARKING_LOT: rule(["parking"]),
  PROFESSIONAL_AND_PUBLIC: rule([
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
  ]),
  SHOPPING_AND_SERVICES: rule(
    ["store", "supermarket", "shopping_mall", "bank", "atm", "pharmacy"],
    ["store", "supermarket", "shopping_mall", "bank", "atm", "pharmacy", "convenience_store", "department_store"]
  ),
  TRANSPORTATION: rule(
    ["airport", "bus_station", "train_station", "subway_station", "transit_station", "taxi_stand", "parking"],
    ["airport", "bus_station", "train_station", "subway_station", "transit_station", "taxi_stand", "parking"]
  ),
  CAR_WASH: rule(["car_wash"]),
  CHARGING_STATION: rule([]),
  GARAGE_AUTOMOTIVE_SHOP: rule(["car_repair"]),
  GAS_STATION: rule(["gas_station"]),
  DONATION_CENTERS: rule([]),
  SHELTER_LOCATIONS: rule(["lodging"]),
  ART_GALLERY: rule(["art_gallery"]),
  CASINO: rule(["casino"]),
  CLUB: rule(["night_club"]),
  TOURIST_ATTRACTION_HISTORIC_SITE: rule(["tourist_attraction"], ["tourist_attraction", "museum"]),
  MOVIE_THEATER: rule(["movie_theater"]),
  MUSEUM: rule(["museum"]),
  MUSIC_VENUE: rule(["night_club", "stadium"], ["night_club", "stadium", "bar"]),
  PERFORMING_ARTS_VENUE: rule(["tourist_attraction", "movie_theater"], ["tourist_attraction", "movie_theater", "stadium"]),
  GAME_CLUB: rule(["bowling_alley", "night_club"]),
  STADIUM_ARENA: rule(["stadium"], ["stadium", "sports_complex"]),
  THEME_PARK: rule(["amusement_park"]),
  ZOO_AQUARIUM: rule(["zoo", "aquarium"]),
  RACING_TRACK: rule(["stadium"]),
  THEATER: rule(["movie_theater", "tourist_attraction"]),
  RESTAURANT: rule(["restaurant"], ["restaurant", "meal_takeaway", "meal_delivery", "food"]),
  BAKERY: rule(["bakery"], ["bakery", "cafe", "food", "store"]),
  DESSERT: rule(["bakery", "cafe"], ["bakery", "cafe", "food", "store"]),
  CAFE: rule(["cafe"], ["cafe", "restaurant", "bakery", "food"]),
  FAST_FOOD: rule(["restaurant", "meal_takeaway"], ["restaurant", "meal_takeaway", "meal_delivery", "cafe", "food"]),
  FOOD_COURT: rule(["restaurant", "meal_takeaway"], ["restaurant", "meal_takeaway", "meal_delivery", "cafe", "food"]),
  BAR: rule(["bar"], ["bar", "restaurant", "food"]),
  ICE_CREAM: rule(["cafe", "bakery"], ["cafe", "bakery", "food", "store"]),
  HOTEL: rule(["lodging"]),
  HOSTEL: rule(["lodging"]),
  CAMPING_TRAILER_PARK: rule(["campground", "rv_park"], ["campground", "rv_park", "lodging"]),
  COTTAGE_CABIN: rule(["lodging"]),
  BED_AND_BREAKFAST: rule(["lodging"]),
  ISLAND: rule(["tourist_attraction", "park"]),
  SEA_LAKE_POOL: rule(["tourist_attraction", "park"]),
  RIVER_STREAM: rule(["tourist_attraction", "park"]),
  FOREST_GROVE: rule(["park"]),
  FARM: rule(["tourist_attraction"]),
  CANAL: rule(["tourist_attraction", "park"]),
  SWAMP_MARSH: rule(["tourist_attraction", "park"]),
  DAM: rule(["tourist_attraction"]),
  CONSTRUCTION_SITE: rule([]),
  PARK: rule(["park"], ["park", "tourist_attraction"]),
  PLAYGROUND: rule(["park"]),
  BEACH: rule(["tourist_attraction", "park"]),
  SPORTS_COURT: rule(["stadium"]),
  GOLF_COURSE: rule(["park", "stadium"]),
  PLAZA: rule(["tourist_attraction", "park"]),
  PROMENADE: rule(["tourist_attraction", "park"]),
  POOL: rule(["gym", "park"]),
  SCENIC_LOOKOUT_VIEWPOINT: rule(["tourist_attraction", "park"]),
  SKI_AREA: rule(["tourist_attraction", "park"]),
  COLLEGE_UNIVERSITY: rule(["university"], ["university", "school"]),
  SCHOOL: rule(["school"]),
  CONVENTIONS_EVENT_CENTER: rule(["stadium", "tourist_attraction"], ["stadium", "tourist_attraction"]),
  GOVERNMENT: rule(["local_government_office"]),
  LIBRARY: rule(["library"]),
  CITY_HALL: rule(["city_hall"]),
  ORGANIZATION_OR_ASSOCIATION: rule([]),
  PRISON_CORRECTIONAL_FACILITY: rule([]),
  COURTHOUSE: rule(["courthouse"]),
  CEMETERY: rule(["cemetery"]),
  FIRE_DEPARTMENT: rule(["fire_station"]),
  POLICE_STATION: rule(["police"]),
  MILITARY: rule([]),
  HOSPITAL_URGENT_CARE: rule(["hospital"], ["hospital", "doctor", "health"]),
  DOCTOR_CLINIC: rule(["doctor"], ["doctor", "hospital", "health"]),
  OFFICES: rule([]),
  POST_OFFICE: rule(["post_office"]),
  RELIGIOUS_CENTER: rule(["church", "mosque", "synagogue", "hindu_temple"]),
  KINDERGARDEN: rule(["primary_school", "school"], ["primary_school", "school"]),
  FACTORY_INDUSTRIAL: rule([]),
  EMBASSY_CONSULATE: rule(["embassy"]),
  INFORMATION_POINT: rule(["tourist_attraction"]),
  EMERGENCY_SHELTER: rule(["lodging"]),
  TRASH_AND_RECYCLING_FACILITIES: rule([]),
  ARTS_AND_CRAFTS: rule(["store"]),
  BANK_FINANCIAL: rule(["bank"]),
  SPORTING_GOODS: rule(["store"]),
  BOOKSTORE: rule(["book_store"], ["book_store", "store"]),
  PHOTOGRAPHY: rule(["store"]),
  CAR_DEALERSHIP: rule(["car_dealer"]),
  FASHION_AND_CLOTHING: rule(["clothing_store"], ["clothing_store", "store"]),
  CONVENIENCE_STORE: rule(["convenience_store"], ["convenience_store", "store", "food"]),
  PERSONAL_CARE: rule(["beauty_salon", "hair_care", "spa"], ["beauty_salon", "hair_care", "spa", "store"]),
  DEPARTMENT_STORE: rule(["department_store"], ["department_store", "store", "shopping_mall"]),
  PHARMACY: rule(["pharmacy"]),
  ELECTRONICS: rule(["electronics_store"], ["electronics_store", "store"]),
  FLOWERS: rule(["florist"]),
  FURNITURE_HOME_STORE: rule(["furniture_store", "home_goods_store"], ["furniture_store", "home_goods_store", "store"]),
  GIFTS: rule(["store"]),
  GYM_FITNESS: rule(["gym"], ["gym", "health", "spa"]),
  SWIMMING_POOL: rule(["gym", "park"], ["gym", "park", "sports_complex"]),
  HARDWARE_STORE: rule(["hardware_store"], ["hardware_store", "store"]),
  MARKET: rule(["supermarket", "store"], ["supermarket", "store", "grocery_or_supermarket"]),
  SUPERMARKET_GROCERY: rule(["supermarket"], ["supermarket", "grocery_or_supermarket", "store"]),
  JEWELRY: rule(["jewelry_store"], ["jewelry_store", "store"]),
  LAUNDRY_DRY_CLEAN: rule(["laundry"], ["laundry", "store"]),
  SHOPPING_CENTER: rule(["shopping_mall"]),
  MUSIC_STORE: rule(["store"]),
  PET_STORE_VETERINARIAN_SERVICES: rule(["pet_store", "veterinary_care"], ["pet_store", "veterinary_care", "store"]),
  TOY_STORE: rule(["store"]),
  TRAVEL_AGENCY: rule(["travel_agency"]),
  ATM: rule(["atm"]),
  CURRENCY_EXCHANGE: rule(["bank", "atm"]),
  CAR_RENTAL: rule(["car_rental"]),
  TELECOM: rule(["store"]),
  AIRPORT: rule(["airport"]),
  BUS_STATION: rule(["bus_station"], ["bus_station", "transit_station"]),
  FERRY_PIER: rule(["transit_station"]),
  SEAPORT_MARINA_HARBOR: rule(["tourist_attraction", "transit_station"], ["transit_station", "tourist_attraction"]),
  SUBWAY_STATION: rule(["subway_station"], ["subway_station", "transit_station"]),
  TRAIN_STATION: rule(["train_station"], ["train_station", "transit_station"]),
  BRIDGE: rule(["tourist_attraction"]),
  TUNNEL: rule([]),
  TAXI_STATION: rule(["taxi_stand"], ["taxi_stand", "transit_station"]),
  JUNCTION_INTERCHANGE: rule([]),
  REST_AREAS: rule(["parking"]),
  CARPOOL_SPOT: rule(["parking"]),
  RESIDENTIAL: rule([]),
  FOREST: rule(["park"]),
  HOSPITAL_MEDICAL_CARE: rule(["hospital"], ["hospital", "doctor", "health"]),
  UNIVERSITY: rule(["university"])
};

// Uses the legacy PlacesService nearbySearch `type` filter, so values must be
// valid Google Maps JavaScript place-search types.
export const CATEGORY_GOOGLE_PLACE_TYPE_MAP: Record<string, readonly string[]> =
  Object.fromEntries(
    Object.entries(CATEGORY_GOOGLE_TYPE_RULES).map(([category, rule]) => [
      category,
      rule.search ?? []
    ])
  );

// Validation can accept a broader set of Google Place details types than
// nearbySearch supports as a `type` filter. Keep search strict and validation
// tolerant so linked-place checks do not over-report on Google's coarse typing.
export const CATEGORY_GOOGLE_VALIDATION_TYPE_MAP: Record<string, readonly string[]> =
  Object.fromEntries(
    Object.entries(CATEGORY_GOOGLE_TYPE_RULES).map(([category, rule]) => [
      category,
      rule.validation ?? rule.search ?? []
    ])
  );

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

interface SuggestionCandidateContext {
  candidate: ExternalProviderCandidate;
  providerId: string;
  name: string;
  distanceMeters?: number;
  nameScore: number;
}

function buildSuggestionCandidates(params: {
  candidates: ExternalProviderCandidate[];
  origin: SearchOrigin;
  getNameScore: (name: string) => number;
  shouldInclude: (context: SuggestionCandidateContext) => boolean;
  reasonVariant?: ExternalProviderSuggestion["reasonVariant"];
}): ExternalProviderSuggestion[] {
  const seenProviderIds = new Set<string>();
  const suggestions: ExternalProviderSuggestion[] = [];

  for (const candidate of params.candidates) {
    const providerId =
      typeof candidate.providerId === "string" ? candidate.providerId.trim() : "";
    const name = typeof candidate.name === "string" ? candidate.name.trim() : "";

    if (!providerId || !name || seenProviderIds.has(providerId)) {
      continue;
    }

    const distanceMeters = candidate.location
      ? calculateDistanceMeters(params.origin, candidate.location)
      : undefined;
    const nameScore = params.getNameScore(name);
    const context: SuggestionCandidateContext = {
      candidate,
      providerId,
      name,
      distanceMeters,
      nameScore
    };

    if (!params.shouldInclude(context)) {
      continue;
    }

    seenProviderIds.add(providerId);
    suggestions.push({
      providerId,
      name,
      address: candidate.address,
      distanceMeters,
      nameScore,
      sortIndex: candidate.sortIndex,
      reasonVariant: params.reasonVariant
    });
  }

  return suggestions;
}

function sortSuggestions(
  suggestions: ExternalProviderSuggestion[],
  compare: (left: ExternalProviderSuggestion, right: ExternalProviderSuggestion) => number
): ExternalProviderSuggestion[] {
  return [...suggestions]
    .sort(compare)
    .slice(0, MAX_EXTERNAL_PROVIDER_SUGGESTIONS);
}

function compareSuggestionsByNameScoreDistance(
  left: ExternalProviderSuggestion,
  right: ExternalProviderSuggestion
): number {
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
}

function compareSuggestionsByDistance(
  left: ExternalProviderSuggestion,
  right: ExternalProviderSuggestion
): number {
  if (
    typeof left.distanceMeters === "number" &&
    typeof right.distanceMeters === "number" &&
    left.distanceMeters !== right.distanceMeters
  ) {
    return left.distanceMeters - right.distanceMeters;
  }

  return left.name.localeCompare(right.name);
}

export function rankExternalProviderSuggestions(
  query: string,
  origin: SearchOrigin,
  candidates: ExternalProviderCandidate[]
): ExternalProviderSuggestion[] {
  const suggestions = buildSuggestionCandidates({
    candidates,
    origin,
    getNameScore: (name) => scoreExternalProviderName(query, name),
    shouldInclude: ({ distanceMeters, nameScore }) => {
      if (nameScore < MIN_NAME_SCORE) {
        return false;
      }

      if (
        typeof distanceMeters === "number" &&
        distanceMeters > MAX_SUGGESTION_DISTANCE_METERS
      ) {
        return false;
      }

      return true;
    }
  });

  return sortSuggestions(suggestions, compareSuggestionsByNameScoreDistance);
}

export function rankNearbyDistanceFallbackSuggestions(
  origin: SearchOrigin,
  candidates: ExternalProviderCandidate[]
): ExternalProviderSuggestion[] {
  const suggestions = buildSuggestionCandidates({
    candidates,
    origin,
    getNameScore: (name) => scoreExternalProviderName(name, name),
    shouldInclude: ({ candidate, distanceMeters }) =>
      !!candidate.location &&
      typeof distanceMeters === "number" &&
      distanceMeters <= MAX_SUGGESTION_DISTANCE_METERS
  });

  return sortSuggestions(suggestions, compareSuggestionsByDistance);
}

export function rankMovedExternalProviderSuggestions(
  query: string,
  origin: SearchOrigin,
  candidates: ExternalProviderCandidate[]
): ExternalProviderSuggestion[] {
  const suggestions = buildSuggestionCandidates({
    candidates,
    origin,
    getNameScore: (name) => scoreExternalProviderName(query, name),
    shouldInclude: ({ candidate, distanceMeters, nameScore }) =>
      !!candidate.location &&
      nameScore >= MIN_MOVED_FALLBACK_NAME_SCORE &&
      typeof distanceMeters === "number" &&
      distanceMeters > MAX_SUGGESTION_DISTANCE_METERS &&
      distanceMeters <= MOVED_FALLBACK_DISTANCE_METERS,
    reasonVariant: "likelyMoved"
  });

  return sortSuggestions(suggestions, compareSuggestionsByDistance);
}

function mapGoogleResults(results: any[]): ExternalProviderCandidate[] {
  return results
    .map((result) => mapGoogleCandidate(result))
    .filter((candidate): candidate is ExternalProviderCandidate => candidate !== undefined);
}

function rankSearchResults(params: {
  query: string;
  origin: SearchOrigin;
  results: any[];
}): ExternalProviderSuggestion[] {
  return rankExternalProviderSuggestions(
    params.query,
    params.origin,
    mapGoogleResults(params.results)
  );
}

async function runAndRankSearch(params: {
  service: any;
  googleMaps: any;
  method: "nearbySearch" | "textSearch";
  request: Record<string, unknown>;
  query: string;
  origin: SearchOrigin;
}): Promise<ExternalProviderSuggestion[]> {
  const results = await runPlacesSearch({
    service: params.service,
    googleMaps: params.googleMaps,
    request: params.request,
    method: params.method
  });

  return rankSearchResults({
    query: params.query,
    origin: params.origin,
    results
  });
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

function runPlacesSearch(params: {
  service: any;
  googleMaps: any;
  request: Record<string, unknown>;
  method: "nearbySearch" | "textSearch";
}): Promise<any[]> {
  return new Promise((resolve) => {
    const searchMethod = params.service?.[params.method];

    if (typeof searchMethod !== "function") {
      resolve([]);
      return;
    }

    searchMethod.call(params.service, params.request, (results: any[], status: unknown) => {
      if (!isSuccessfulPlacesStatus(status, params.googleMaps)) {
        logger.warn(`External provider ${params.method} failed: ${String(status)}`);
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

    const results = await runPlacesSearch({
      service,
      googleMaps,
      request,
      method: "nearbySearch"
    });

    for (const candidate of mapGoogleResults(results)) {
      if (!candidate.providerId || seenProviderIds.has(candidate.providerId)) {
        continue;
      }

      seenProviderIds.add(candidate.providerId);
      candidates.push(candidate);
    }
  }

  return candidates;
}

export async function findSuggestedExternalProviders(
  venue: any,
  query: string
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

      const typedNearbyDistanceFallbackSuggestions =
        rankNearbyDistanceFallbackSuggestions(origin, typedNearbyCandidates);

      if (typedNearbyDistanceFallbackSuggestions.length > 0) {
        logger.info(
          `Found ${typedNearbyDistanceFallbackSuggestions.length} category-typed nearby external provider distance fallback suggestion(s)`
        );
        return typedNearbyDistanceFallbackSuggestions;
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

      const nearbySuggestions = await runAndRankSearch({
        service,
        googleMaps,
        method: "nearbySearch",
        request: nearbySearchRequest,
        query: searchQuery,
        origin
      });

      if (nearbySuggestions.length > 0) {
        return nearbySuggestions;
      }

      const textSuggestions = await runAndRankSearch({
        service,
        googleMaps,
        method: "textSearch",
        request: {
          query: searchQuery,
          location,
          radius: MAX_SUGGESTION_DISTANCE_METERS
        },
        query: searchQuery,
        origin
      });

      if (textSuggestions.length > 0) {
        return textSuggestions;
      }

      const movedFallbackResults = await runPlacesSearch({
        service,
        googleMaps,
        method: "textSearch",
        request: {
          query: searchQuery,
          location,
          radius: MOVED_FALLBACK_DISTANCE_METERS
        }
      });
      const movedFallbackSuggestions = rankMovedExternalProviderSuggestions(
        searchQuery,
        origin,
        mapGoogleResults(movedFallbackResults)
      );

      if (movedFallbackSuggestions.length > 0) {
        logger.info(
          `Found ${movedFallbackSuggestions.length} likely-moved external provider suggestion(s)`
        );
        return movedFallbackSuggestions;
      }
    } else {
      logger.warn("Cannot initialize Google Places container for external provider suggestions");
    }
  } else {
    logger.info(
      "Google Places service unavailable on host window; falling back to editor autocomplete suggestions"
    );

    const editorCandidates = await findExternalProviderEditorCandidates(searchQuery);
    return rankExternalProviderSuggestions(
      searchQuery,
      origin,
      editorCandidates
    );
  }

  return [];
}

function buildSuggestionReason(suggestion: ExternalProviderSuggestion): string {
  if (suggestion.reasonVariant === "likelyMoved") {
    return t("proposal.externalProvider.reason.likelyMoved", {
      distanceMeters: suggestion.distanceMeters ?? 0
    });
  }

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
