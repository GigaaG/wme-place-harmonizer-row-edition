import { logger } from "../logging/logger";
import { getWmeSdk } from "../integration/sdk/wme";
import type { VisibleVenueScanSummary, ScannedVenueResult } from "../types/scan";

const HIGHLIGHT_LAYER_NAME = "wmeph-row-visible-venues";
const HIGHLIGHT_CHECKBOX_NAME = "Place Harmonizer scan highlights";

let layerInitialized = false;
let checkboxInitialized = false;
let highlightedFeatureIds: string[] = [];

function buildFeatureId(venueId: string): string {
  return `wmeph-row-highlight-${venueId}`;
}

function getSeverityColor(severity: "ok" | "warning" | "error"): string {
  if (severity === "error") {
    return "#d32f2f";
  }

  if (severity === "warning") {
    return "#f9a825";
  }

  return "#2e7d32";
}

function createPointFeature(result: ScannedVenueResult, coordinates: number[]) {
  return {
    id: buildFeatureId(result.venueId),
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates
    },
    properties: {
      severity: result.severity,
      venueId: result.venueId,
      venueName: result.name,
      issueCount: result.issueCount,
      featureType: "SDKFeature"
    }
  };
}

function createPolygonFeature(result: ScannedVenueResult, coordinates: number[][][]) {
  return {
    id: buildFeatureId(result.venueId),
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates
    },
    properties: {
      severity: result.severity,
      venueId: result.venueId,
      venueName: result.name,
      issueCount: result.issueCount,
      featureType: "SDKFeature"
    }
  };
}

function buildSdkFeature(venue: any, result: ScannedVenueResult) {
  const geometry = venue.geometry;

  if (!geometry) {
    return null;
  }

  if (
    (geometry.type === "Point" || geometry.type === "point") &&
    Array.isArray(geometry.coordinates)
  ) {
    return createPointFeature(result, geometry.coordinates);
  }

  if (
    (geometry.type === "Polygon" || geometry.type === "polygon") &&
    Array.isArray(geometry.coordinates)
  ) {
    return createPolygonFeature(result, geometry.coordinates);
  }

  return null;
}

export function ensureHighlightLayer(): void {
  const sdk = getWmeSdk();

  if (!sdk) {
    logger.warn("Cannot initialize highlight layer: SDK unavailable");
    return;
  }

  if (!layerInitialized) {
    sdk.Map.addLayer({
      layerName: HIGHLIGHT_LAYER_NAME,
      styleRules: [
        {
          predicate: (featureProperties: any) => featureProperties?.severity === "error",
          style: {
            strokeColor: "#d32f2f",
            fillColor: "#d32f2f",
            strokeOpacity: 0.9,
            fillOpacity: 0.2,
            strokeWidth: 3,
            pointRadius: 8
          }
        },
        {
          predicate: (featureProperties: any) => featureProperties?.severity === "warning",
          style: {
            strokeColor: "#f9a825",
            fillColor: "#f9a825",
            strokeOpacity: 0.9,
            fillOpacity: 0.2,
            strokeWidth: 3,
            pointRadius: 8
          }
        },
        {
          predicate: (featureProperties: any) => featureProperties?.severity === "ok",
          style: {
            strokeColor: "#2e7d32",
            fillColor: "#2e7d32",
            strokeOpacity: 0.8,
            fillOpacity: 0.15,
            strokeWidth: 2,
            pointRadius: 7
          }
        }
      ]
    });

    layerInitialized = true;
    logger.info("Highlight layer initialized");
  }

  if (!checkboxInitialized) {
    sdk.LayerSwitcher.addLayerCheckbox({
      name: HIGHLIGHT_CHECKBOX_NAME,
      isChecked: true
    });

    checkboxInitialized = true;
    logger.info("Highlight layer checkbox initialized");
  }
}

export function clearHighlights(): void {
  const sdk = getWmeSdk();

  if (!sdk || highlightedFeatureIds.length === 0) {
    highlightedFeatureIds = [];
    return;
  }

  for (const featureId of highlightedFeatureIds) {
    try {
      sdk.Map.removeFeatureFromLayer({
        layerName: HIGHLIGHT_LAYER_NAME,
        featureId
      });
    } catch {
      // ignore stale removals
    }
  }

  highlightedFeatureIds = [];
  logger.info("Highlight layer cleared");
}

export function renderHighlights(summary: VisibleVenueScanSummary, venues: any[]): void {
  const sdk = getWmeSdk();

  if (!sdk) {
    logger.warn("Cannot render highlights: SDK unavailable");
    return;
  }

  ensureHighlightLayer();
  clearHighlights();

  const venueMap = new Map<string, any>();

  for (const venue of venues) {
    venueMap.set(String(venue.id), venue);
  }

  const features: any[] = [];

  for (const result of summary.results) {
    const venue = venueMap.get(String(result.venueId));

    if (!venue) {
      continue;
    }

    const feature = buildSdkFeature(venue, result);

    if (!feature) {
      continue;
    }

    features.push(feature);
    highlightedFeatureIds.push(feature.id);
  }

  if (features.length === 0) {
    logger.info("No highlight features to render");
    return;
  }

  sdk.Map.addFeaturesToLayer({
    layerName: HIGHLIGHT_LAYER_NAME,
    features
  });

  logger.info(`Rendered ${features.length} highlight feature(s)`);
}