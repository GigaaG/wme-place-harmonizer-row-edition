import { logger } from "../logging/logger";
import { getWmeSdk } from "../integration/sdk/wme";
import type { VisibleVenueScanSummary, ScannedVenueResult } from "../types/scan";

const HIGHLIGHT_LAYER_NAME = "wmeph-row-visible-venues";
const HIGHLIGHT_CHECKBOX_NAME = "Place Harmonizer scan highlights";
const MIN_POINT_HIGHLIGHT_ZOOM = 17;
const POINT_HIGHLIGHT_RADIUS = 12;
const POINT_HIGHLIGHT_STROKE = 5;
const POLYGON_HIGHLIGHT_STROKE = 4;
const POLYGON_OUTLINE_STROKE = 6;
const POLYGON_OUTLINE_HALO_STROKE = 10;

let layerInitialized = false;
let checkboxInitialized = false;
let highlightedFeatureIds: string[] = [];

interface HighlightRenderOptions {
  keepExistingOnEmpty?: boolean;
}

export interface HighlightRenderResult {
  renderedFeatureCount: number;
  keptExisting: boolean;
}

function buildFeatureId(venueId: string, variant: string): string {
  return `wmeph-row-highlight-${venueId}-${variant}`;
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

function getSeverityOutlineColor(severity: "ok" | "warning" | "error"): string {
  if (severity === "error") {
    return "#d32f2f";
  }

  if (severity === "warning") {
    return "#f9a825";
  }

  return "#00c853";
}

function getPolygonFillOpacity(severity: "ok" | "warning" | "error"): number {
  if (severity === "ok") {
    return 0.36;
  }

  return 0.28;
}

function getPointHighlightStyle(severity: "ok" | "warning" | "error") {
  return {
    strokeColor: getSeverityColor(severity),
    fillColor: "#ffffff",
    strokeOpacity: 1,
    fillOpacity: 0,
    strokeWidth: POINT_HIGHLIGHT_STROKE,
    pointRadius: POINT_HIGHLIGHT_RADIUS
  };
}

function getPolygonHighlightStyle(severity: "ok" | "warning" | "error") {
  return {
    strokeColor: getSeverityColor(severity),
    fillColor: getSeverityColor(severity),
    strokeOpacity: 1,
    fillOpacity: getPolygonFillOpacity(severity),
    strokeWidth: POLYGON_HIGHLIGHT_STROKE
  };
}

function getPolygonOutlineStyle(severity: "ok" | "warning" | "error") {
  return {
    strokeColor: getSeverityOutlineColor(severity),
    fillColor: getSeverityOutlineColor(severity),
    strokeOpacity: 1,
    fillOpacity: 0,
    strokeWidth: POLYGON_OUTLINE_STROKE
  };
}

function getPolygonOutlineHaloStyle() {
  return {
    strokeColor: "#ffffff",
    fillColor: "#ffffff",
    strokeOpacity: 0.95,
    fillOpacity: 0,
    strokeWidth: POLYGON_OUTLINE_HALO_STROKE
  };
}

function createPointFeature(
  result: ScannedVenueResult,
  coordinates: number[],
  variant: string
) {
  return {
    id: buildFeatureId(result.venueId, variant),
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
      geometryKind: "point",
      highlightVariant: variant,
      featureType: "SDKFeature"
    }
  };
}

function createPolygonFeature(
  result: ScannedVenueResult,
  coordinates: number[][][],
  variant: string,
  geometryKind: "polygon-fill" | "polygon-outline-halo" | "polygon-outline"
) {
  return {
    id: buildFeatureId(result.venueId, variant),
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
      geometryKind,
      highlightVariant: variant,
      featureType: "SDKFeature"
    }
  };
}

function buildSdkFeatures(
  venue: any,
  result: ScannedVenueResult,
  allowPointHighlights: boolean
): any[] {
  const geometry = venue.geometry;

  if (!geometry) {
    return [];
  }

  if (
    (geometry.type === "Point" || geometry.type === "point") &&
    Array.isArray(geometry.coordinates)
  ) {
    if (!allowPointHighlights) {
      return [];
    }

    return [
      createPointFeature(result, geometry.coordinates, "point-marker")
    ];
  }

  if (
    (geometry.type === "Polygon" || geometry.type === "polygon") &&
    Array.isArray(geometry.coordinates)
  ) {
    return [
      createPolygonFeature(result, geometry.coordinates, "polygon-shape-fill", "polygon-fill"),
      createPolygonFeature(
        result,
        geometry.coordinates,
        "polygon-shape-outline-halo",
        "polygon-outline-halo"
      ),
      createPolygonFeature(result, geometry.coordinates, "polygon-shape-outline", "polygon-outline")
    ];
  }

  if (
    (geometry.type === "MultiPolygon" || geometry.type === "multipolygon") &&
    Array.isArray(geometry.coordinates)
  ) {
    const features: any[] = [];

    for (let index = 0; index < geometry.coordinates.length; index += 1) {
      const polygonCoordinates = geometry.coordinates[index];

      if (!Array.isArray(polygonCoordinates)) {
        continue;
      }

      const variant = `polygon-part-${index}`;
      features.push(
        createPolygonFeature(result, polygonCoordinates, `${variant}-fill`, "polygon-fill")
      );
      features.push(
        createPolygonFeature(
          result,
          polygonCoordinates,
          `${variant}-outline-halo`,
          "polygon-outline-halo"
        )
      );
      features.push(
        createPolygonFeature(result, polygonCoordinates, `${variant}-outline`, "polygon-outline")
      );
    }

    return features;
  }

  return [];
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function resolveCurrentZoomLevel(sdk: any): number | null {
  const map = sdk?.Map;

  if (!map) {
    return null;
  }

  const zoomCandidates: unknown[] = [];
  const lookups = [
    () => map.getZoomLevel?.(),
    () => map.getZoom?.(),
    () => map.getMapZoom?.(),
    () => map.zoomLevel,
    () => map.zoom,
    () => map.currentZoom
  ];

  for (const lookup of lookups) {
    try {
      zoomCandidates.push(lookup());
    } catch {
      // ignore lookup signature mismatch
    }
  }

  for (const candidate of zoomCandidates) {
    const directNumber = toNumber(candidate);

    if (directNumber !== null) {
      return directNumber;
    }

    if (candidate && typeof candidate === "object") {
      const typedCandidate = candidate as Record<string, unknown>;
      const nestedNumber = toNumber(
        typedCandidate.zoom ?? typedCandidate.level ?? typedCandidate.value
      );

      if (nestedNumber !== null) {
        return nestedNumber;
      }
    }
  }

  return null;
}

function buildStyleRules() {
  const severities: Array<"ok" | "warning" | "error"> = ["error", "warning", "ok"];
  const rules: any[] = [];

  for (const severity of severities) {
    rules.push({
      predicate: (featureProperties: any) =>
        featureProperties?.severity === severity &&
        featureProperties?.geometryKind === "point",
      style: getPointHighlightStyle(severity)
    });

    rules.push({
      predicate: (featureProperties: any) =>
        featureProperties?.severity === severity &&
        featureProperties?.geometryKind === "polygon-fill",
      style: getPolygonHighlightStyle(severity)
    });

    rules.push({
      predicate: (featureProperties: any) =>
        featureProperties?.severity === severity &&
        featureProperties?.geometryKind === "polygon-outline-halo",
      style: getPolygonOutlineHaloStyle()
    });

    rules.push({
      predicate: (featureProperties: any) =>
        featureProperties?.severity === severity &&
        featureProperties?.geometryKind === "polygon-outline",
      style: getPolygonOutlineStyle(severity)
    });
  }

  return rules;
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
      styleRules: buildStyleRules()
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

export function renderHighlights(
  summary: VisibleVenueScanSummary,
  venues: any[],
  options: HighlightRenderOptions = {}
): HighlightRenderResult {
  const sdk = getWmeSdk();

  if (!sdk) {
    logger.warn("Cannot render highlights: SDK unavailable");
    return {
      renderedFeatureCount: 0,
      keptExisting: false
    };
  }

  ensureHighlightLayer();

  const currentZoomLevel = resolveCurrentZoomLevel(sdk);
  const allowPointHighlights =
    currentZoomLevel === null ||
    currentZoomLevel >= MIN_POINT_HIGHLIGHT_ZOOM;

  const venueMap = new Map<string, any>();

  for (const venue of venues) {
    venueMap.set(String(venue.id), venue);
  }

  const polygonFillFeatures: any[] = [];
  const polygonOutlineHaloFeatures: any[] = [];
  const polygonOutlineFeatures: any[] = [];
  const pointFeatures: any[] = [];
  const nextFeatureIds: string[] = [];

  for (const result of summary.results) {
    const venue = venueMap.get(String(result.venueId));

    if (!venue) {
      continue;
    }

    const venueFeatures = buildSdkFeatures(venue, result, allowPointHighlights);

    if (venueFeatures.length === 0) {
      continue;
    }

    for (const feature of venueFeatures) {
      const geometryKind = feature?.properties?.geometryKind;

      if (geometryKind === "polygon-fill") {
        polygonFillFeatures.push(feature);
      } else if (geometryKind === "polygon-outline-halo") {
        polygonOutlineHaloFeatures.push(feature);
      } else if (geometryKind === "polygon-outline") {
        polygonOutlineFeatures.push(feature);
      } else {
        pointFeatures.push(feature);
      }

      nextFeatureIds.push(feature.id);
    }
  }

  const features = [
    ...polygonFillFeatures,
    ...polygonOutlineHaloFeatures,
    ...polygonOutlineFeatures,
    ...pointFeatures
  ];

  if (features.length === 0) {
    if (
      options.keepExistingOnEmpty &&
      allowPointHighlights &&
      highlightedFeatureIds.length > 0
    ) {
      logger.info("No drawable highlights, keeping existing rendered layer");
      return {
        renderedFeatureCount: 0,
        keptExisting: true
      };
    }

    clearHighlights();
    logger.info("No highlight features to render");
    return {
      renderedFeatureCount: 0,
      keptExisting: false
    };
  }

  clearHighlights();

  sdk.Map.addFeaturesToLayer({
    layerName: HIGHLIGHT_LAYER_NAME,
    features
  });

  highlightedFeatureIds = nextFeatureIds;
  logger.info(`Rendered ${features.length} highlight feature(s)`);

  return {
    renderedFeatureCount: features.length,
    keptExisting: false
  };
}
