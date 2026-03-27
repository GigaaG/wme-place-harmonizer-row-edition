import { logger } from "../../logging/logger.ts";
import type { PlaceIssue } from "../../types/issue.ts";
import type { PlaceProposal } from "../../types/proposal.ts";
import type { OpeningHourDefinition } from "../../types/place.ts";
import type {
  GoogleMapsValidationCheckKey,
  GoogleMapsValidationSettings
} from "../../types/settings.ts";
import {
  CATEGORY_GOOGLE_PLACE_TYPE_MAP,
  buildGoogleMapsPlaceUrl,
  scoreExternalProviderName
} from "./external-provider-suggestions.ts";
import { t } from "../../i18n/runtime.ts";

const EXTERNAL_PROVIDER_VALIDATION_NAME_MATCH_THRESHOLD = 0.92;
const EXTERNAL_PROVIDER_VALIDATION_LOCATION_DRIFT_THRESHOLD_METERS = 250;
const EXTERNAL_PROVIDER_VALIDATION_RULE_ID_PREFIX = "externalProvider.validation.";

interface SearchOrigin {
  lon: number;
  lat: number;
}

interface LinkedExternalProviderValidationParams {
  venueName: string;
  externalProviderIds: string[];
  venue?: any;
  currentCategories?: string[];
  currentOpeningHours?: OpeningHourDefinition[];
  settings?: GoogleMapsValidationSettings;
}

interface ExternalProviderValidationSnapshot {
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
  googleOpeningHoursDisplay?: string;
}

interface ExternalProviderValidationFinding {
  issue: PlaceIssue;
  proposal: PlaceProposal;
}

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

function trimString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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

function normalizeBusinessStatus(value: unknown): string | undefined {
  const trimmed = trimString(value);
  return trimmed ? trimmed.toUpperCase() : undefined;
}

function buildValidationGroupKey(providerId: string, ruleId: string): string {
  return `externalProviderIds::validation:${providerId}:${ruleId}`;
}

function appendReasonDetail(reason: string, detail?: string): string {
  return detail ? `${reason} | ${detail}` : reason;
}

function normalizeTime(value: unknown, allow2400 = true): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  let digits = value.trim().replaceAll(":", "");
  if (digits.length === 3) {
    digits = digits.padStart(4, "0");
  }

  if (!/^\d{4}$/.test(digits)) {
    return undefined;
  }

  if (digits === "2400") {
    return allow2400 ? "24:00" : undefined;
  }

  const hours = Number(digits.slice(0, 2));
  const minutes = Number(digits.slice(2, 4));

  if (hours > 23 || minutes > 59) {
    return undefined;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

function isValidDay(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6;
}

function buildDaySlot(day: number, fromHour: string, toHour: string): string {
  return `${day}:${fromHour}-${toHour}`;
}

function expandDailyHoursRange(
  openDay: number,
  openTime: string,
  closeDay: number,
  closeTime: string
): string[] {
  if (openDay === closeDay && openTime < closeTime) {
    return [buildDaySlot(openDay, openTime, closeTime)];
  }

  const slots: string[] = [];
  let currentDay = openDay;
  let safety = 0;

  while (safety < 8) {
    const fromHour = currentDay === openDay ? openTime : "00:00";
    const toHour = currentDay === closeDay ? closeTime : "24:00";

    if (fromHour !== toHour) {
      slots.push(buildDaySlot(currentDay, fromHour, toHour));
    }

    if (currentDay === closeDay) {
      break;
    }

    currentDay = (currentDay + 1) % 7;
    safety += 1;
  }

  return slots;
}

function normalizeCurrentOpeningHours(
  openingHours: OpeningHourDefinition[] = []
): string[] | null {
  const slots: string[] = [];

  for (const entry of openingHours) {
    const fromHour = normalizeTime(entry?.fromHour, false);
    const toHour = normalizeTime(entry?.toHour);

    if (!fromHour || !toHour || !Array.isArray(entry?.days)) {
      return null;
    }

    for (const day of entry.days) {
      if (!isValidDay(day)) {
        return null;
      }

      if (fromHour < toHour) {
        slots.push(buildDaySlot(day, fromHour, toHour));
      } else if (fromHour > toHour) {
        slots.push(
          ...expandDailyHoursRange(day, fromHour, (day + 1) % 7, toHour)
        );
      }
    }
  }

  return Array.from(new Set(slots)).sort();
}

function normalizeGoogleOpeningHours(openingHours: any): string[] | null {
  const periods = Array.isArray(openingHours?.periods)
    ? openingHours.periods
    : [];

  if (periods.length === 0) {
    return [];
  }

  if (
    periods.length === 1 &&
    isValidDay(periods[0]?.open?.day) &&
    periods[0]?.open?.day === 0 &&
    normalizeTime(periods[0]?.open?.time, false) === "00:00" &&
    !periods[0]?.close
  ) {
    return Array.from({ length: 7 }, (_, day) =>
      buildDaySlot(day, "00:00", "24:00")
    );
  }

  const slots: string[] = [];

  for (const period of periods) {
    const openDay = period?.open?.day;
    const closeDay = period?.close?.day;
    const openTime = normalizeTime(period?.open?.time, false);
    const closeTime = normalizeTime(period?.close?.time);

    if (
      !isValidDay(openDay) ||
      !isValidDay(closeDay) ||
      !openTime ||
      !closeTime
    ) {
      return null;
    }

    slots.push(...expandDailyHoursRange(openDay, openTime, closeDay, closeTime));
  }

  return Array.from(new Set(slots)).sort();
}

function formatOpeningHoursDisplay(
  weekdayText?: string[],
  normalizedHours?: string[] | null
): string | undefined {
  if (Array.isArray(weekdayText) && weekdayText.length > 0) {
    return weekdayText.join(" | ");
  }

  if (Array.isArray(normalizedHours) && normalizedHours.length > 0) {
    return normalizedHours.join(", ");
  }

  return undefined;
}

function formatWmeOpeningHoursDisplay(
  openingHours: OpeningHourDefinition[] = []
): string | undefined {
  const normalizedHours = normalizeCurrentOpeningHours(openingHours);

  if (normalizedHours && normalizedHours.length > 0) {
    return normalizedHours.join(", ");
  }

  if (openingHours.length === 0) {
    return undefined;
  }

  return openingHours
    .map((entry) => {
      const days = Array.isArray(entry.days) ? entry.days.join("/") : "?";
      const fromHour = trimString(entry.fromHour) ?? "?";
      const toHour = trimString(entry.toHour) ?? "?";
      return `${days}:${fromHour}-${toHour}`;
    })
    .join(", ");
}

function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function normalizeGooglePlaceTypes(types: unknown): string[] {
  if (!Array.isArray(types)) {
    return [];
  }

  return Array.from(
    new Set(
      types
        .map((type) => trimString(type)?.toLowerCase())
        .filter((type): type is string => !!type)
    )
  ).sort();
}

function resolveExpectedGooglePlaceTypes(categories: string[] = []): string[] {
  const expectedTypes = new Set<string>();

  for (const category of categories) {
    for (const placeType of CATEGORY_GOOGLE_PLACE_TYPE_MAP[category] ?? []) {
      expectedTypes.add(placeType.toLowerCase());
    }
  }

  return Array.from(expectedTypes).sort();
}

function buildExternalProviderValidationProposal(params: {
  providerId: string;
  ruleId: string;
  currentValue?: unknown;
  displayCurrentValue?: string;
  displayProposedValue?: string;
  displayProposedValueUrl?: string;
  reason: string;
}): PlaceProposal {
  return {
    id: `${params.ruleId}:${params.providerId}`,
    field: "externalProviderIds",
    groupKey: buildValidationGroupKey(params.providerId, params.ruleId),
    currentValue: params.currentValue ?? params.providerId,
    displayCurrentValue: params.displayCurrentValue ?? params.providerId,
    proposedValue: params.displayProposedValue,
    displayProposedValue: params.displayProposedValue,
    displayProposedValueUrl: params.displayProposedValueUrl,
    reason: params.reason,
    issueRuleId: params.ruleId,
    isApplySupported: false,
    actionType: "manual-only"
  };
}

function isValidationEnabled(
  settings: GoogleMapsValidationSettings | undefined,
  checkKey: GoogleMapsValidationCheckKey
): boolean {
  if (settings?.enabled === false) {
    return false;
  }

  return settings?.checks?.[checkKey] ?? true;
}

function buildValidationFinding(params: {
  providerId: string;
  ruleIdSuffix: string;
  severity: "warning" | "info";
  message: string;
  currentValue?: unknown;
  displayCurrentValue?: string;
  displayProposedValue?: string;
  displayProposedValueUrl?: string;
  reason: string;
}): ExternalProviderValidationFinding {
  const ruleId = `${EXTERNAL_PROVIDER_VALIDATION_RULE_ID_PREFIX}${params.ruleIdSuffix}`;

  return {
    issue: {
      field: "externalProviderIds",
      severity: params.severity,
      message: params.message,
      groupKey: buildValidationGroupKey(params.providerId, ruleId),
      ruleId
    },
    proposal: buildExternalProviderValidationProposal({
      providerId: params.providerId,
      ruleId,
      currentValue: params.currentValue,
      displayCurrentValue: params.displayCurrentValue,
      displayProposedValue: params.displayProposedValue,
      displayProposedValueUrl: params.displayProposedValueUrl,
      reason: params.reason
    })
  };
}

export function isExternalProviderValidationRuleId(
  ruleId?: string
): boolean {
  return (
    typeof ruleId === "string" &&
    ruleId.startsWith(EXTERNAL_PROVIDER_VALIDATION_RULE_ID_PREFIX)
  );
}

export function buildExternalProviderValidationFindings(
  snapshot: ExternalProviderValidationSnapshot,
  settings?: GoogleMapsValidationSettings
): ExternalProviderValidationFinding[] {
  const providerId = trimString(snapshot.providerId);

  if (!providerId) {
    return [];
  }

  const venueName = trimString(snapshot.venueName) ?? "";
  const placeName = trimString(snapshot.placeName);
  const address = trimString(snapshot.address);
  const googleUrl =
    trimString(snapshot.url) ??
    (placeName
      ? buildGoogleMapsPlaceUrl({
          providerId,
          name: placeName,
          address,
          nameScore: 1
        })
      : undefined);
  const businessStatus = normalizeBusinessStatus(snapshot.businessStatus);
  const findings: ExternalProviderValidationFinding[] = [];

  if (snapshot.notFound && isValidationEnabled(settings, "notFound")) {
    findings.push(
      buildValidationFinding({
        providerId,
        ruleIdSuffix: "notFound",
        severity: "warning",
        message: t("issue.externalProvider.validation.notFound", {
          providerId
        }),
        displayProposedValue: t("proposal.externalProvider.validation.notFound"),
        reason: t("proposal.externalProvider.validation.reason.notFound")
      })
    );
  }

  if (
    (businessStatus === "CLOSED_PERMANENTLY" ||
      snapshot.businessStatus === "permanently_closed") &&
    isValidationEnabled(settings, "closed")
  ) {
    findings.push(
      buildValidationFinding({
        providerId,
        ruleIdSuffix: "closed",
        severity: "warning",
        message: t("issue.externalProvider.validation.closed", {
          placeName: placeName ?? providerId
        }),
        displayProposedValue: placeName,
        displayProposedValueUrl: googleUrl,
        reason: appendReasonDetail(
          t("proposal.externalProvider.validation.reason.closed"),
          address
        )
      })
    );
  }

  if (
    typeof snapshot.distanceMeters === "number" &&
    snapshot.distanceMeters >=
      EXTERNAL_PROVIDER_VALIDATION_LOCATION_DRIFT_THRESHOLD_METERS &&
    isValidationEnabled(settings, "locationDrift")
  ) {
    findings.push(
      buildValidationFinding({
        providerId,
        ruleIdSuffix: "locationDrift",
        severity: "warning",
        message: t("issue.externalProvider.validation.locationDrift", {
          placeName: placeName ?? providerId,
          distanceMeters: snapshot.distanceMeters
        }),
        displayProposedValue: placeName
          ? t("proposal.externalProvider.displayWithDistance", {
              name: placeName,
              distanceMeters: snapshot.distanceMeters
            })
          : undefined,
        displayProposedValueUrl: googleUrl,
        reason: appendReasonDetail(
          t("proposal.externalProvider.validation.reason.locationDrift", {
            distanceMeters: snapshot.distanceMeters
          }),
          address
        )
      })
    );
  }

  if (
    venueName &&
    placeName &&
    scoreExternalProviderName(venueName, placeName) <
      EXTERNAL_PROVIDER_VALIDATION_NAME_MATCH_THRESHOLD &&
    isValidationEnabled(settings, "nameMismatch")
  ) {
    findings.push(
      buildValidationFinding({
        providerId,
        ruleIdSuffix: "nameMismatch",
        severity: "info",
        message: t("issue.externalProvider.validation.nameMismatch", {
          venueName,
          placeName
        }),
        currentValue: venueName,
        displayCurrentValue: venueName,
        displayProposedValue: placeName,
        displayProposedValueUrl: googleUrl,
        reason: appendReasonDetail(
          t("proposal.externalProvider.validation.reason.nameMismatch"),
          address
        )
      })
    );
  }

  const googleTypes = normalizeGooglePlaceTypes(snapshot.googleTypes);
  const expectedGoogleTypes = resolveExpectedGooglePlaceTypes(
    snapshot.currentCategories ?? []
  );

  if (
    isValidationEnabled(settings, "category") &&
    googleTypes.length > 0 &&
    expectedGoogleTypes.length > 0 &&
    !googleTypes.some((type) => expectedGoogleTypes.includes(type))
  ) {
    findings.push(
      buildValidationFinding({
        providerId,
        ruleIdSuffix: "categoryMismatch",
        severity: "info",
        message: t("issue.externalProvider.validation.categoryMismatch", {
          placeName: placeName ?? providerId
        }),
        currentValue: snapshot.currentCategories ?? [],
        displayCurrentValue:
          (snapshot.currentCategories ?? []).length > 0
            ? snapshot.currentCategories?.join(", ")
            : undefined,
        displayProposedValue: googleTypes.join(", "),
        displayProposedValueUrl: googleUrl,
        reason: t("proposal.externalProvider.validation.reason.categoryMismatch", {
          googleTypes: googleTypes.join(", "),
          expectedTypes: expectedGoogleTypes.join(", ")
        })
      })
    );
  }

  const normalizedCurrentOpeningHours = snapshot.currentOpeningHours
    ? normalizeCurrentOpeningHours(snapshot.currentOpeningHours)
    : [];

  if (
    isValidationEnabled(settings, "openingHours") &&
    normalizedCurrentOpeningHours !== null &&
    snapshot.googleOpeningHours &&
    !arraysEqual(
      normalizedCurrentOpeningHours,
      snapshot.googleOpeningHours
    )
  ) {
    findings.push(
      buildValidationFinding({
        providerId,
        ruleIdSuffix: "openingHoursDifferent",
        severity: "info",
        message: t("issue.externalProvider.validation.openingHoursDifferent", {
          placeName: placeName ?? providerId
        }),
        currentValue: snapshot.currentOpeningHours ?? [],
        displayCurrentValue:
          formatWmeOpeningHoursDisplay(snapshot.currentOpeningHours ?? []) ??
          t("common.missing"),
        displayProposedValue: snapshot.googleOpeningHoursDisplay,
        displayProposedValueUrl: googleUrl,
        reason: appendReasonDetail(
          t("proposal.externalProvider.validation.reason.openingHoursDifferent"),
          address
        )
      })
    );
  }

  return findings;
}

function isOkPlaceDetailsStatus(status: unknown, googleMaps: any): boolean {
  const placesStatus = googleMaps?.places?.PlacesServiceStatus;

  return status === "OK" || status === placesStatus?.OK;
}

function isNotFoundPlaceDetailsStatus(status: unknown, googleMaps: any): boolean {
  const placesStatus = googleMaps?.places?.PlacesServiceStatus;

  return (
    status === "NOT_FOUND" ||
    status === placesStatus?.NOT_FOUND ||
    status === "INVALID_REQUEST" ||
    status === placesStatus?.INVALID_REQUEST ||
    status === "ZERO_RESULTS" ||
    status === placesStatus?.ZERO_RESULTS
  );
}

function runPlaceDetailsLookup(
  service: any,
  request: Record<string, unknown>
): Promise<{ result: any; status: unknown }> {
  return new Promise((resolve) => {
    service.getDetails(request, (result: any, status: unknown) => {
      resolve({ result, status });
    });
  });
}

export async function validateLinkedExternalProviders(
  params: LinkedExternalProviderValidationParams
): Promise<{
  issues: PlaceIssue[];
  proposals: PlaceProposal[];
}> {
  const uniqueProviderIds = Array.from(
    new Set(
      params.externalProviderIds
        .map((providerId) => trimString(providerId))
        .filter((providerId): providerId is string => !!providerId)
    )
  );

  if (
    uniqueProviderIds.length === 0 ||
    typeof window === "undefined" ||
    params.settings?.enabled === false
  ) {
    return {
      issues: [],
      proposals: []
    };
  }

  const googleMaps = getGoogleMapsApi();

  if (!googleMaps) {
    logger.info(
      "Google Places service unavailable on host window; skipping linked external provider validation"
    );
    return {
      issues: [],
      proposals: []
    };
  }

  const container = ensurePlacesServiceContainer();

  if (!container) {
    logger.warn(
      "Cannot initialize Google Places container for linked external provider validation"
    );
    return {
      issues: [],
      proposals: []
    };
  }

  const venueOrigin = getVenueSearchOrigin(params.venue);
  const normalizedCurrentOpeningHours = normalizeCurrentOpeningHours(
    params.currentOpeningHours ?? []
  );

  logger.info(
    `Validating ${uniqueProviderIds.length} linked external provider(s) for venue "${params.venueName}"` +
      (venueOrigin
        ? ` at ${venueOrigin.lat.toFixed(6)},${venueOrigin.lon.toFixed(6)}`
        : " without usable venue geometry")
  );

  const service = new googleMaps.places.PlacesService(container);
  const issues: PlaceIssue[] = [];
  const proposals: PlaceProposal[] = [];

  for (const providerId of uniqueProviderIds) {
    logger.info(`Validating linked external provider ${providerId}`);

    const { result, status } = await runPlaceDetailsLookup(service, {
      placeId: providerId,
      fields: [
        "place_id",
        "name",
        "formatted_address",
        "geometry",
        "url",
        "types",
        "business_status",
        "permanently_closed",
        "opening_hours"
      ]
    });

    let findings: ExternalProviderValidationFinding[] = [];

    if (isOkPlaceDetailsStatus(status, googleMaps)) {
      const placeLocation = readLocation(result?.geometry?.location);
      const distanceMeters =
        venueOrigin && placeLocation
          ? calculateDistanceMeters(venueOrigin, placeLocation)
          : undefined;
      const googleOpeningHours = normalizeGoogleOpeningHours(
        result?.opening_hours
      );
      const googleTypes = normalizeGooglePlaceTypes(result?.types);
      const googleOpeningHoursDisplay = formatOpeningHoursDisplay(
        Array.isArray(result?.opening_hours?.weekday_text)
          ? result.opening_hours.weekday_text
          : undefined,
        googleOpeningHours
      );

      logger.info(
        `Linked provider ${providerId} resolved: name=${trimString(result?.name) ?? "none"}, status=${normalizeBusinessStatus(result?.business_status) ?? (result?.permanently_closed ? "CLOSED_PERMANENTLY" : "none")}, distance=${distanceMeters ?? "n/a"}, types=${googleTypes.join(",") || "none"}, openingHours=${googleOpeningHours ? googleOpeningHours.length : "unsupported"}`
      );

      findings = buildExternalProviderValidationFindings(
        {
          providerId,
          venueName: params.venueName,
          placeName: trimString(result?.name),
          address: trimString(result?.formatted_address),
          url: trimString(result?.url),
          distanceMeters,
          currentCategories: params.currentCategories ?? [],
          googleTypes,
          currentOpeningHours: params.currentOpeningHours ?? [],
          googleOpeningHours,
          googleOpeningHoursDisplay,
          businessStatus:
            normalizeBusinessStatus(result?.business_status) ??
            (result?.permanently_closed ? "permanently_closed" : undefined)
        },
        params.settings
      );

      if (
        isValidationEnabled(params.settings, "openingHours") &&
        normalizedCurrentOpeningHours === null
      ) {
        logger.warn(
          `Linked provider ${providerId}: current WME opening hours could not be normalized for comparison`
        );
      }

      if (
        isValidationEnabled(params.settings, "openingHours") &&
        googleOpeningHours === null
      ) {
        logger.warn(
          `Linked provider ${providerId}: Google opening hours could not be normalized for comparison`
        );
      }
    } else if (isNotFoundPlaceDetailsStatus(status, googleMaps)) {
      logger.info(`Linked provider ${providerId} could not be resolved: ${String(status)}`);
      findings = buildExternalProviderValidationFindings(
        {
          providerId,
          venueName: params.venueName,
          notFound: true
        },
        params.settings
      );
    } else {
      logger.warn(
        `Linked external provider validation failed for ${providerId}: ${String(status)}`
      );
    }

    if (findings.length > 0) {
      for (const finding of findings) {
        logger.info(
          `Linked provider ${providerId} validation issue: ${finding.issue.ruleId} (${finding.issue.severity})`
        );
        issues.push(finding.issue);
        proposals.push(finding.proposal);
      }
    } else {
      logger.info(`Linked provider ${providerId} validation passed`);
    }
  }

  return {
    issues,
    proposals
  };
}
