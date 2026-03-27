import { logger } from "../../logging/logger.ts";
import { getCurrentEditorLockLevel, getWmeSdk } from "./wme.ts";
import type { PlaceProposal } from "../../types/proposal";
import { applyExternalProviderProposalInEditor } from "./external-provider-editor.ts";

interface ApplyResult {
  applied: number;
  skipped: number;
  errors: string[];
}

interface PointGeometry {
  type: "Point";
  coordinates: [number, number];
}

interface PolygonGeometry {
  type: "Polygon";
  coordinates: [[number, number][]];
}

interface BuildUpdateArgsResult {
  args: Record<string, unknown>;
  appliedProposalCount: number;
  errors: string[];
}

const EARTH_METERS_PER_LATITUDE_DEGREE = 111320;
const POINT_TO_POLYGON_HALF_SIDE_METERS = 5;

function normalizeOpeningHourTime(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (!/^\d{2}:\d{2}$/.test(trimmed)) {
    return undefined;
  }

  const hours = Number(trimmed.slice(0, 2));
  const minutes = Number(trimmed.slice(3, 5));

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return undefined;
  }

  return trimmed;
}

function sanitizeOpeningHoursForSdkUpdate(
  value: unknown
): Array<{ days: number[]; fromHour: string; toHour: string }> | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const sanitized: Array<{ days: number[]; fromHour: string; toHour: string }> = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      return undefined;
    }

    const typedEntry = entry as {
      days?: unknown;
      fromHour?: unknown;
      toHour?: unknown;
    };
    const rawDays = Array.isArray(typedEntry.days) ? typedEntry.days : undefined;
    const fromHour = normalizeOpeningHourTime(typedEntry.fromHour);
    const toHour = normalizeOpeningHourTime(typedEntry.toHour);

    if (!rawDays || rawDays.length === 0 || !fromHour || !toHour) {
      return undefined;
    }

    const days = Array.from(
      new Set(
        rawDays.filter(
          (day): day is number =>
            typeof day === "number" &&
            Number.isInteger(day) &&
            day >= 0 &&
            day <= 6
        )
      )
    ).sort((left, right) => left - right);

    if (days.length !== rawDays.length) {
      return undefined;
    }

    sanitized.push({
      days,
      fromHour,
      toHour
    });
  }

  return sanitized;
}

function buildUpdatedServices(
  currentServices: string[],
  proposals: PlaceProposal[]
): string[] {
  const result = new Set(currentServices);

  for (const proposal of proposals) {
    if (proposal.field !== "services" || !proposal.serviceName) {
      continue;
    }

    if (proposal.actionType === "add-service") {
      result.add(proposal.serviceName);
    }

    if (proposal.actionType === "remove-service") {
      result.delete(proposal.serviceName);
    }
  }

  return Array.from(result.values());
}

function buildUpdatedAliases(
  currentAliases: string[],
  proposals: PlaceProposal[]
): string[] {
  const result = new Set(currentAliases);

  for (const proposal of proposals) {
    if (proposal.field !== "aliases" || !proposal.aliasName) {
      continue;
    }

    if (proposal.actionType === "add-alias") {
      result.add(proposal.aliasName);
    }

    if (proposal.actionType === "remove-alias") {
      result.delete(proposal.aliasName);
    }
  }

  return Array.from(result.values());
}

function isLonLatPair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  );
}

function normalizeRingCoordinates(value: unknown): [number, number][] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isLonLatPair);
}

function calculatePolygonCentroid(
  ring: [number, number][]
): [number, number] | undefined {
  if (ring.length === 0) {
    return undefined;
  }

  let crossSum = 0;
  let centroidX = 0;
  let centroidY = 0;

  for (let index = 0; index < ring.length; index += 1) {
    const [currentLon, currentLat] = ring[index];
    const [nextLon, nextLat] = ring[(index + 1) % ring.length];
    const cross = currentLon * nextLat - nextLon * currentLat;

    crossSum += cross;
    centroidX += (currentLon + nextLon) * cross;
    centroidY += (currentLat + nextLat) * cross;
  }

  if (crossSum !== 0) {
    return [
      centroidX / (3 * crossSum),
      centroidY / (3 * crossSum)
    ];
  }

  const total = ring.reduce(
    (result, [lon, lat]) => {
      result.lon += lon;
      result.lat += lat;
      return result;
    },
    { lon: 0, lat: 0 }
  );

  return [total.lon / ring.length, total.lat / ring.length];
}

function getPolygonArea(ring: [number, number][]): number {
  if (ring.length === 0) {
    return 0;
  }

  let crossSum = 0;

  for (let index = 0; index < ring.length; index += 1) {
    const [currentLon, currentLat] = ring[index];
    const [nextLon, nextLat] = ring[(index + 1) % ring.length];
    crossSum += currentLon * nextLat - nextLon * currentLat;
  }

  return Math.abs(crossSum / 2);
}

function extractCoordinatesFromNavigationPoint(
  navigationPoint: unknown
): [number, number] | undefined {
  if (!navigationPoint) {
    return undefined;
  }

  if (isLonLatPair(navigationPoint)) {
    return navigationPoint;
  }

  if (typeof navigationPoint !== "object") {
    return undefined;
  }

  const typedNavigationPoint = navigationPoint as {
    coordinates?: unknown;
    point?: { coordinates?: unknown };
    geometry?: { coordinates?: unknown };
  };

  return (
    (isLonLatPair(typedNavigationPoint.coordinates)
      ? typedNavigationPoint.coordinates
      : undefined) ??
    (isLonLatPair(typedNavigationPoint.point?.coordinates)
      ? typedNavigationPoint.point.coordinates
      : undefined) ??
    (isLonLatPair(typedNavigationPoint.geometry?.coordinates)
      ? typedNavigationPoint.geometry.coordinates
      : undefined)
  );
}

function buildPointGeometryFromVenue(venue: any): PointGeometry | undefined {
  const navigationPointCandidates = [
    ...(Array.isArray(venue?.navigationPoints) ? venue.navigationPoints : []),
    venue?.navigationPoint
  ];

  for (const navigationPoint of navigationPointCandidates) {
    const coordinates = extractCoordinatesFromNavigationPoint(navigationPoint);

    if (coordinates) {
      return {
        type: "Point",
        coordinates
      };
    }
  }

  const geometry = venue?.geometry;

  if (!geometry) {
    return undefined;
  }

  if (geometry.type === "Point" || geometry.type === "point") {
    const coordinates = isLonLatPair(geometry.coordinates)
      ? geometry.coordinates
      : undefined;

    return coordinates
      ? {
          type: "Point",
          coordinates
        }
      : undefined;
  }

  if (geometry.type === "Polygon" || geometry.type === "polygon") {
    const outerRing = normalizeRingCoordinates(geometry.coordinates?.[0]);
    const centroid = calculatePolygonCentroid(outerRing);

    return centroid
      ? {
          type: "Point",
          coordinates: centroid
        }
      : undefined;
  }

  if (geometry.type === "MultiPolygon" || geometry.type === "multipolygon") {
    const polygons = Array.isArray(geometry.coordinates)
      ? geometry.coordinates
      : [];
    let largestRing: [number, number][] = [];
    let largestArea = 0;

    for (const polygon of polygons) {
      const outerRing = normalizeRingCoordinates(polygon?.[0]);
      const area = getPolygonArea(outerRing);

      if (area > largestArea) {
        largestArea = area;
        largestRing = outerRing;
      }
    }

    const centroid = calculatePolygonCentroid(largestRing);

    return centroid
      ? {
          type: "Point",
          coordinates: centroid
        }
      : undefined;
  }

  return undefined;
}

function metersToLatitudeDegrees(meters: number): number {
  return meters / EARTH_METERS_PER_LATITUDE_DEGREE;
}

function metersToLongitudeDegrees(meters: number, latitude: number): number {
  const latitudeRadians = (latitude * Math.PI) / 180;
  const metersPerDegree =
    EARTH_METERS_PER_LATITUDE_DEGREE * Math.max(Math.cos(latitudeRadians), 0.000001);

  return meters / metersPerDegree;
}

function buildPolygonGeometryFromVenue(venue: any): PolygonGeometry | undefined {
  const geometry = venue?.geometry;

  if (
    !geometry ||
    (geometry.type !== "Point" && geometry.type !== "point") ||
    !isLonLatPair(geometry.coordinates)
  ) {
    return undefined;
  }

  const [lon, lat] = geometry.coordinates;
  const latOffset = metersToLatitudeDegrees(POINT_TO_POLYGON_HALF_SIDE_METERS);
  const lonOffset = metersToLongitudeDegrees(
    POINT_TO_POLYGON_HALF_SIDE_METERS,
    lat
  );

  return {
    type: "Polygon",
    coordinates: [[
      [lon - lonOffset, lat - latOffset],
      [lon + lonOffset, lat - latOffset],
      [lon + lonOffset, lat + latOffset],
      [lon - lonOffset, lat + latOffset],
      [lon - lonOffset, lat - latOffset]
    ]]
  };
}

function buildUpdateArgs(
  venueId: string,
  currentServices: string[],
  currentAliases: string[],
  proposals: PlaceProposal[],
  editorLockLevel?: number,
  currentVenue?: any
): BuildUpdateArgsResult {
  const args: Record<string, unknown> = { venueId };
  const errors: string[] = [];
  let appliedProposalCount = 0;

  const serviceProposals = proposals.filter(
    (proposal) => proposal.field === "services" && proposal.isApplySupported
  );

  if (serviceProposals.length > 0) {
    args.services = buildUpdatedServices(currentServices, serviceProposals);
    appliedProposalCount += serviceProposals.length;
  }

  const aliasProposals = proposals.filter(
    (proposal) => proposal.field === "aliases" && proposal.isApplySupported
  );

  if (aliasProposals.length > 0) {
    args.aliases = buildUpdatedAliases(currentAliases, aliasProposals);
    appliedProposalCount += aliasProposals.length;
  }

  for (const proposal of proposals) {
    if (!proposal.isApplySupported) {
      continue;
    }

    if (proposal.field === "services" || proposal.field === "aliases") {
      continue;
    }

    switch (proposal.field) {
      case "name":
        args.name = proposal.proposedValue as string;
        appliedProposalCount += 1;
        break;
      case "lockLevel": {
        const requestedLockLevel = proposal.proposedValue;

        if (
          typeof requestedLockLevel === "number" &&
          Number.isInteger(requestedLockLevel) &&
          requestedLockLevel >= 1
        ) {
          const appliedLockLevel =
            typeof editorLockLevel === "number"
              ? Math.min(requestedLockLevel, editorLockLevel)
              : requestedLockLevel;

          args.lockRank = appliedLockLevel - 1;
          appliedProposalCount += 1;
        }
        break;
      }
      case "phone":
        args.phone = proposal.proposedValue as string;
        appliedProposalCount += 1;
        break;
      case "url":
        args.url = proposal.proposedValue as string;
        appliedProposalCount += 1;
        break;
      case "openingHours":
        {
          const openingHours = sanitizeOpeningHoursForSdkUpdate(
            proposal.proposedValue
          );

          if (!openingHours) {
            errors.push(
              "Opening-hours proposal could not be converted to a valid WME SDK openingHours payload"
            );
            break;
          }

          args.openingHours = openingHours;
          appliedProposalCount += 1;
        }
        break;
      case "geometry": {
        if (proposal.proposedValue === "point") {
          const geometry = buildPointGeometryFromVenue(currentVenue);

          if (!geometry) {
            errors.push("Could not derive a point geometry from the current venue");
            break;
          }

          args.geometry = geometry;
          appliedProposalCount += 1;
          break;
        }

        if (proposal.proposedValue === "polygon") {
          const geometry = buildPolygonGeometryFromVenue(currentVenue);

          if (!geometry) {
            errors.push("Could not derive a polygon geometry from the current venue");
            break;
          }

          args.geometry = geometry;
          appliedProposalCount += 1;
          break;
        }

        errors.push(
          `Geometry proposal "${String(proposal.proposedValue)}" is not supported for apply`
        );
        break;
      }
      default:
        break;
    }
  }

  return {
    args,
    appliedProposalCount,
    errors
  };
}

export async function applyVenueProposals(
  venueId: string,
  currentServices: string[],
  currentAliases: string[],
  proposals: PlaceProposal[]
): Promise<ApplyResult> {
  const supported = proposals.filter((proposal) => proposal.isApplySupported);
  const sdkSupported = supported.filter(
    (proposal) => proposal.field !== "externalProviderIds"
  );
  const editorSupported = supported.filter(
    (proposal) => proposal.field === "externalProviderIds"
  );
  const skipped = proposals.length - supported.length;
  const errors: string[] = [];
  let applied = 0;

  if (supported.length === 0) {
    return {
      applied: 0,
      skipped,
      errors: []
    };
  }

  if (sdkSupported.length > 0) {
    const sdk = getWmeSdk();

    if (!sdk) {
      errors.push("WME SDK is not available");
    } else {
      const editorLockLevel = getCurrentEditorLockLevel();
      const currentVenue = sdk.DataModel?.Venues?.getById?.({ venueId });
      const buildResult = buildUpdateArgs(
        venueId,
        currentServices,
        currentAliases,
        sdkSupported,
        editorLockLevel,
        currentVenue
      );

      errors.push(...buildResult.errors);

      if (buildResult.appliedProposalCount > 0) {
        try {
          sdk.DataModel.Venues.updateVenue(buildResult.args);
          applied += buildResult.appliedProposalCount;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown apply error";

          logger.error(`Failed to apply SDK proposals: ${message}`);
          errors.push(message);
        }
      }
    }
  }

  for (const proposal of editorSupported) {
    const appliedInEditor = await applyExternalProviderProposalInEditor(proposal);

    if (appliedInEditor) {
      applied += 1;
      continue;
    }

    errors.push("Could not select the suggested external provider in the editor");
  }

  logger.info(`Applied ${applied} proposal(s) to venue ${venueId}`);

  return {
    applied,
    skipped,
    errors
  };
}
