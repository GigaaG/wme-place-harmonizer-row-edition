import { APP_NAME } from "../constants/app";
import { SCRIPT_BUILD_CHANNEL } from "../constants/build";
import { logger } from "../logging/logger";
import { settingsManager } from "../settings/manager";
import {
  getDefaultGoogleMapsValidationAvailability,
  getEffectiveGoogleMapsValidationSettings,
  resolveGoogleMapsValidationAvailability
} from "../settings/google-maps-validation-policy";
import { mountSidebarPlaceholder } from "../integration/sdk/sidebar";
import { loadManifest } from "../config/manifest-loader";
import { resolveRuntimeConfig } from "../config/runtime-config";
import { resolveRuntimeChains } from "../config/runtime-chains";
import { matchPlaceToChain } from "../matching/chain-matcher";
import { resolveCategoryStandards } from "../config/category-standards";
import { resolveEffectivePolicy } from "../config/effective-policy";
import { onVenueSelected } from "../integration/sdk/venue-selection";
import { mapVenueToPlaceLike } from "../integration/sdk/venue-mapper";
import { evaluatePlace } from "../rules/evaluate-place";
import { validateUrlAvailability } from "../rules/url-availability.ts";
import {
  waitForWmeSdkReady,
  waitForInitialMapDataLoaded,
  getCurrentEditorLockLevel,
  getCurrentWmeLocale,
  getWmeSdk
} from "../integration/sdk/wme";
import { onFeatureEditorOpened } from "../integration/sdk/feature-editor";
import {
  renderFeatureEditorAnalysis,
  type PendingWhitelistRenderAction
} from "../ui/feature-editor/renderer";
import { groupIssuesForFeatureEditor } from "../ui/feature-editor/issue-groups";
import {
  setLatestAnalysisState,
  getLatestAnalysisState,
  clearLatestAnalysisState
} from "./analysis-state";
import {
  removeFeatureEditorContainer,
  retryEnsureFeatureEditorContainer
} from "../ui/feature-editor/container";
import { generateProposals } from "../proposals/generate-proposals";
import { getSelectedProposals } from "../ui/feature-editor/actions";
import { applyVenueProposals } from "../integration/sdk/venue-updater";
import type { PlaceProposal } from "../types/proposal";
import { setSidebarDebugState, getSidebarDebugState } from "./app-state";
import { renderSidebarDebugPanel } from "../ui/sidebar/renderer";
import {
  wireSidebarPanelActions,
  wireSidebarReloadButton,
  wireSidebarScanButton,
  wireSidebarAutoScanToggle,
  wireSidebarNaturalFeaturesHighlightToggle,
  wireSidebarGoogleMapsValidationChecks,
  wireSidebarGoogleMapsValidationToggle
} from "../ui/sidebar/actions";
import { getVisibleVenues } from "../integration/sdk/visible-venues";
import { scanVisibleVenues } from "./scan-visible-venues";
import { ensureHighlightLayer, renderHighlights } from "../highlighter/highlighter-manager";
import { registerAutoScanListeners } from "../integration/sdk/map-auto-scan";
import { registerVenueSaveScanListener } from "../integration/sdk/venue-save-scan";
import { normalizeCountryCode } from "../config/country-code";
import { DATA_REPOSITORY_BRANCH } from "../config/source";
import {
  resolveVenueCountryCode,
  resolveCountryCodeFromCountryEntity,
  resolveCountryCodeFromCountryId
} from "../integration/sdk/venue-country";
import type { PlaceIssue } from "../types/issue";
import {
  buildSuggestedExternalProviderIssueMessage,
  buildExternalProviderSuggestionProposals,
  findSuggestedExternalProviders
} from "../integration/sdk/external-provider-suggestions";
import {
  isExternalProviderValidationRuleId,
  validateLinkedExternalProviders
} from "../integration/sdk/external-provider-validation";
import type { WhitelistEntry, WhitelistRuntimeSnapshot } from "../types/whitelist";
import {
  filterWhitelistedAnalysis,
  upsertWhitelistEntries
} from "../whitelist/manager";
import {
  cancelPendingWhitelistAction,
  getPendingWhitelistActionsForVenue,
  schedulePendingWhitelistAction,
  type PendingWhitelistAction
} from "../whitelist/pending-actions";
import { loadBestAvailableLocale } from "../i18n/locale-loader.ts";
import { setRuntimeLocale, t } from "../i18n/runtime.ts";
import type {
  GoogleMapsValidationCheckKey,
  GoogleMapsValidationSettings,
  UserSettings
} from "../types/settings";

//
// Runtime containers
//

let runtimeManifest: any | null = null;
let runtimeConfig: any | null = null;
let runtimeChains: any | null = null;
let runtimeSettings: UserSettings | null = null;
let runtimeCountry: string | undefined;
let externalProviderSuggestionRequestId = 0;
let externalProviderValidationRequestId = 0;
let urlAvailabilityRequestId = 0;
let pendingWhitelistRenderTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

//
// Functions
//

function resolvePreferredCountry(params: {
  primaryCountry?: string;
  mapContextCountry?: string;
  runtimeCountry?: string;
  fallbackCountry?: string;
}): string | undefined {
  const candidates = [
    params.primaryCountry,
    params.mapContextCountry,
    params.runtimeCountry,
    params.fallbackCountry
  ];

  for (const candidate of candidates) {
    const normalizedCountry = normalizeCountryCode(candidate);
    if (normalizedCountry) {
      return normalizedCountry;
    }
  }

  return undefined;
}

function getCountryFromCurrentSelection(): string | undefined {
  const sdk = getWmeSdk();

  if (!sdk) {
    return undefined;
  }

  const selection = sdk.Editing?.getSelection?.();
  if (!selection || selection.objectType !== "venue") {
    return undefined;
  }

  const venueId = selection.ids?.[0];
  if (!venueId) {
    return undefined;
  }

  const venue = sdk.DataModel?.Venues?.getById?.({ venueId });
  if (!venue) {
    return undefined;
  }

  return resolveVenueCountryCode(venue);
}

function getCountryFromVisibleMapContext(): string | undefined {
  const sdk = getWmeSdk();
  const countries = sdk?.DataModel?.Countries;
  const topCountry = resolveCountryCodeFromCountryEntity(
    countries?.getTopCountry?.()
  );
  let centerCountry: string | undefined;

  const mapCenter =
    sdk?.Map?.getMapCenter?.() ??
    sdk?.Map?.getCenter?.();

  let lon: number | undefined;
  let lat: number | undefined;

  if (Array.isArray(mapCenter) && mapCenter.length >= 2) {
    const [centerLon, centerLat] = mapCenter;
    if (typeof centerLon === "number" && typeof centerLat === "number") {
      lon = centerLon;
      lat = centerLat;
    }
  } else if (mapCenter && typeof mapCenter === "object") {
    const center = mapCenter as Record<string, unknown>;
    const rawLon = center.lon ?? center.lng ?? center.x;
    const rawLat = center.lat ?? center.y;

    if (typeof rawLon === "number" && typeof rawLat === "number") {
      lon = rawLon;
      lat = rawLat;
    }
  }

  if (countries && typeof lon === "number" && typeof lat === "number") {
    const lookups = [
      () => countries.getByPoint?.({ lon, lat }),
      () => countries.getByPoint?.([lon, lat]),
      () => countries.getByPoint?.(lon, lat),
      () => countries.getByCoordinates?.({ lon, lat }),
      () => countries.getByCoordinates?.([lon, lat]),
      () => countries.getByCoordinates?.(lon, lat),
      () => countries.getByLocation?.({ lon, lat }),
      () => countries.getByLocation?.({ lat, lon }),
      () => countries.getByLocation?.(lon, lat),
      () => countries.getByLonLat?.({ lon, lat }),
      () => countries.getByLonLat?.(lon, lat),
      () => countries.getByLatLon?.({ lat, lon }),
      () => countries.getByLatLon?.(lat, lon)
    ];

    for (const lookup of lookups) {
      try {
        const result = lookup();

        const entries = Array.isArray(result) ? result : [result];
        for (const entry of entries) {
          const country = resolveCountryCodeFromCountryEntity(entry);
          if (country) {
            centerCountry = country;
            break;
          }
        }

        if (centerCountry) {
          break;
        }
      } catch {
        // Ignore lookup shape mismatch and continue with next method.
      }
    }
  }

  const venues = getVisibleVenues();
  let venueCountry: string | undefined;
  for (const venue of venues) {
    const country = resolveVenueCountryCode(venue);
    if (country) {
      venueCountry = country;
      break;
    }
  }

  const segments = sdk?.DataModel?.Segments?.getAll?.();
  let segmentCountry: string | undefined;

  if (Array.isArray(segments)) {
    for (const segment of segments) {
      const countryIdCandidates = [
        segment?.countryID,
        segment?.countryId,
        segment?.attributes?.countryID,
        segment?.attributes?.countryId,
        segment?.address?.countryID,
        segment?.address?.countryId
      ];

      for (const countryId of countryIdCandidates) {
        const resolved = resolveCountryCodeFromCountryId(countryId);
        if (resolved) {
          segmentCountry = resolved;
          break;
        }
      }

      if (segmentCountry) {
        break;
      }

      const countryObjectCandidates = [
        segment?.country,
        segment?.address?.country
      ];

      for (const countryObject of countryObjectCandidates) {
        const resolved = resolveCountryCodeFromCountryEntity(countryObject);
        if (resolved) {
          segmentCountry = resolved;
          break;
        }
      }

      if (segmentCountry) {
        break;
      }
    }
  }

  const hostWindow = (() => {
    try {
      if (typeof unsafeWindow !== "undefined") {
        return unsafeWindow as any;
      }
    } catch {
      // ignore
    }

    return window as any;
  })();

  let legacyCountry: string | undefined;
  const legacySegments = hostWindow?.W?.model?.segments?.objects;
  const legacyCountriesModel = hostWindow?.W?.model?.countries;

  if (legacySegments && typeof legacySegments === "object") {
    for (const segment of Object.values(legacySegments) as any[]) {
      const countryId =
        segment?.attributes?.countryID ??
        segment?.attributes?.countryId ??
        segment?.countryID ??
        segment?.countryId;

      if (countryId === undefined || countryId === null) {
        continue;
      }

      const countryObject =
        legacyCountriesModel?.getObjectById?.(countryId) ??
        legacyCountriesModel?.objects?.[countryId];

      const resolved =
        resolveCountryCodeFromCountryEntity(countryObject?.attributes ?? countryObject) ??
        resolveCountryCodeFromCountryId(countryId);

      if (resolved) {
        legacyCountry = resolved;
        break;
      }
    }
  }

  logger.info(
    `Map country candidates: top=${topCountry ?? "none"}, center=${centerCountry ?? "none"}, venues=${venueCountry ?? "none"}, segments=${segmentCountry ?? "none"}, legacy=${legacyCountry ?? "none"}`
  );

  return topCountry ?? centerCountry ?? venueCountry ?? segmentCountry ?? legacyCountry;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function findMissingExternalProviderIssue(
  issues: PlaceIssue[]
): PlaceIssue | undefined {
  return issues.find(
    (issue) =>
      issue.field === "externalProviderIds" &&
      (issue.ruleId === "externalProvider.required" ||
        issue.ruleId === "externalProvider.recommended")
  );
}

function readConfigDefaultLocale(config: any): string | undefined {
  return typeof config?.defaults?.locale === "string"
    ? config.defaults.locale
    : undefined;
}

function formatAnalysisCountLabel(issues: PlaceIssue[]): string {
  const findingsLabel = t("status.analysisCount.findings", {
    count: issues.length
  });
  const warningOrErrorCount = issues.filter(
    (issue) => issue.severity === "warning" || issue.severity === "error"
  ).length;

  if (warningOrErrorCount === issues.length) {
    return findingsLabel;
  }

  const infoCount = issues.length - warningOrErrorCount;
  return t("status.analysisCount.findingsWithInfo", {
    count: issues.length,
    infoCount
  });
}

function getCurrentWhitelistRuntimeSnapshot():
  | WhitelistRuntimeSnapshot
  | null {
  if (!runtimeConfig || !runtimeChains) {
    return null;
  }

  return {
    configId: runtimeConfig.id,
    configVersion: runtimeConfig.version,
    chainsId: runtimeChains.id,
    chainsVersion: runtimeChains.version
  };
}

function applyWhitelistToAnalysis(params: {
  venueId: string;
  issues: PlaceIssue[];
  proposals: PlaceProposal[];
}): {
  issues: PlaceIssue[];
  proposals: PlaceProposal[];
  suppressedIssueCount: number;
} {
  const whitelistRuntime = getCurrentWhitelistRuntimeSnapshot();

  if (!whitelistRuntime) {
    return {
      issues: params.issues,
      proposals: params.proposals,
      suppressedIssueCount: 0
    };
  }

  return filterWhitelistedAnalysis({
    placeId: params.venueId,
    issues: params.issues,
    proposals: params.proposals,
    runtime: whitelistRuntime
  });
}

function getPendingWhitelistRenderActions(
  venueId: string
): PendingWhitelistRenderAction[] {
  const now = Date.now();

  return getPendingWhitelistActionsForVenue(venueId).map((action) => ({
    groupKey: action.groupKey,
    field: action.field,
    severity: action.severity,
    message: action.message,
    expiresInSeconds: Math.max(
      1,
      Math.ceil((action.expiresAt - now) / 1000)
    )
  }));
}

function getFeatureEditorScrollContainer(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    '#wmeph-row-feature-editor [data-wmeph-row-scroll-container="true"]'
  );
}

function cancelPendingWhitelistRenderTimer(): void {
  if (pendingWhitelistRenderTimer !== null) {
    globalThis.clearTimeout(pendingWhitelistRenderTimer);
    pendingWhitelistRenderTimer = null;
  }
}

function refreshPendingWhitelistCountdowns(venueId: string): void {
  const pendingWhitelistActions = getPendingWhitelistRenderActions(venueId);

  if (pendingWhitelistActions.length === 0) {
    cancelPendingWhitelistRenderTimer();
    return;
  }

  for (const action of pendingWhitelistActions) {
    const message = document.querySelector<HTMLElement>(
      `.wmeph-row-pending-whitelist-message[data-group-key="${CSS.escape(action.groupKey)}"]`
    );

    if (message) {
      message.textContent = t("featureEditor.ignorePending");
    }

    const button = document.querySelector<HTMLButtonElement>(
      `.wmeph-row-undo-whitelist[data-group-key="${CSS.escape(action.groupKey)}"]`
    );

    if (button) {
      button.textContent = `${t("featureEditor.undoIgnore")} (${action.expiresInSeconds}s)`;
    }
  }
}

function schedulePendingWhitelistRenderTick(venueId: string): void {
  cancelPendingWhitelistRenderTimer();

  if (!document.getElementById("wmeph-row-feature-editor")) {
    return;
  }

  if (getPendingWhitelistActionsForVenue(venueId).length === 0) {
    return;
  }

  pendingWhitelistRenderTimer = globalThis.setTimeout(() => {
    pendingWhitelistRenderTimer = null;

    const latest = getLatestAnalysisState();

    if (!latest?.isVenueSelection || latest.venueId !== venueId) {
      return;
    }

    refreshPendingWhitelistCountdowns(venueId);
    schedulePendingWhitelistRenderTick(venueId);
  }, 1000);
}

function renderLatestVenueAnalysis(): void {
  const latest = getLatestAnalysisState();

  if (!latest?.isVenueSelection) {
    cancelPendingWhitelistRenderTimer();
    return;
  }

  const pendingWhitelistActions = getPendingWhitelistRenderActions(latest.venueId);
  const previousScrollTop = getFeatureEditorScrollContainer()?.scrollTop ?? null;

  renderFeatureEditorAnalysis(
    latest.placeName,
    latest.chainId,
    latest.issues,
    latest.proposals,
    latest.statusMessage,
    pendingWhitelistActions
  );
  const scrollContainer = getFeatureEditorScrollContainer();

  if (previousScrollTop !== null && scrollContainer) {
    scrollContainer.scrollTop = previousScrollTop;
  }

  wireApplyButton();
  wireWhitelistButtons();
  wireUndoWhitelistButtons();
  if (pendingWhitelistActions.length > 0) {
    schedulePendingWhitelistRenderTick(latest.venueId);
  } else {
    cancelPendingWhitelistRenderTimer();
  }
}

async function refreshRuntimeLocale(): Promise<void> {
  if (!runtimeManifest || !runtimeConfig) {
    return;
  }

  try {
    const localeFile = await loadBestAvailableLocale({
      manifest: runtimeManifest,
      preferredLocale: getCurrentWmeLocale(),
      fallbackLocale: readConfigDefaultLocale(runtimeConfig)
    });

    setRuntimeLocale(localeFile);
    logger.info(`Runtime locale loaded: ${localeFile.locale}`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown locale loading error";
    logger.warn(`Runtime locale could not be loaded: ${message}`);
  }
}

function applyExternalProviderSuggestionToIssues(
  issues: PlaceIssue[],
  targetIssue: PlaceIssue,
  suggestionMessage?: string
): PlaceIssue[] {
  return issues.map((issue) => {
    if (
      issue.field !== targetIssue.field ||
      issue.ruleId !== targetIssue.ruleId
    ) {
      return issue;
    }

    return {
      ...issue,
      message: suggestionMessage ?? targetIssue.message
    };
  });
}

function removeExternalProviderValidationIssues(
  issues: PlaceIssue[]
): PlaceIssue[] {
  return issues.filter(
    (issue) => !isExternalProviderValidationRuleId(issue.ruleId)
  );
}

function removeExternalProviderValidationProposals(
  proposals: PlaceProposal[]
): PlaceProposal[] {
  return proposals.filter(
    (proposal) => !isExternalProviderValidationRuleId(proposal.issueRuleId)
  );
}

function removeUrlAvailabilityIssues(
  issues: PlaceIssue[]
): PlaceIssue[] {
  return issues.filter((issue) => issue.ruleId !== "urlValidation.availability");
}

async function refreshExternalProviderSuggestions(params: {
  requestId: number;
  venue: any;
  issue: PlaceIssue;
  query: string;
}): Promise<void> {
  const suggestions = await findSuggestedExternalProviders(
    params.venue,
    params.query
  );

  if (params.requestId !== externalProviderSuggestionRequestId) {
    return;
  }

  const latest = getLatestAnalysisState();

  if (!latest?.isVenueSelection || latest.venueId !== String(params.venue.id)) {
    return;
  }

  const retainedProposals = latest.proposals.filter(
    (proposal) =>
      !(
        proposal.field === params.issue.field &&
        proposal.issueRuleId === params.issue.ruleId
      )
  );
  const suggestionProposals = buildExternalProviderSuggestionProposals(
    params.issue,
    suggestions,
    latest.currentExternalProviderIds
  );
  const topSuggestion = suggestions[0];
  const issuesWithSuggestion = applyExternalProviderSuggestionToIssues(
    latest.issues,
    params.issue,
    buildSuggestedExternalProviderIssueMessage(params.issue, topSuggestion)
  );
  const filteredAnalysis = applyWhitelistToAnalysis({
    venueId: latest.venueId,
    issues: issuesWithSuggestion,
    proposals: [...retainedProposals, ...suggestionProposals]
  });

  setLatestAnalysisState({
    ...latest,
    issues: filteredAnalysis.issues,
    proposals: filteredAnalysis.proposals
  });

  logger.info(
    suggestions.length > 0
      ? `Found ${suggestions.length} external provider suggestion(s) for venue ${params.venue.id}`
      : `No nearby external provider suggestions found for venue ${params.venue.id}`
  );

  renderLatestVenueAnalysis();
}

async function refreshUrlAvailabilityValidation(params: {
  requestId: number;
  venueId: string;
  url: string;
}): Promise<void> {
  const issue = await validateUrlAvailability(params.url);

  if (params.requestId !== urlAvailabilityRequestId) {
    return;
  }

  const latest = getLatestAnalysisState();

  if (!latest?.isVenueSelection || latest.venueId !== params.venueId) {
    return;
  }

  const filteredAnalysis = applyWhitelistToAnalysis({
    venueId: latest.venueId,
    issues: issue
      ? [...removeUrlAvailabilityIssues(latest.issues), issue]
      : removeUrlAvailabilityIssues(latest.issues),
    proposals: latest.proposals
  });

  setLatestAnalysisState({
    ...latest,
    issues: filteredAnalysis.issues,
    proposals: filteredAnalysis.proposals
  });

  renderLatestVenueAnalysis();
}

async function refreshExternalProviderValidation(params: {
  requestId: number;
  venueId: string;
  venueName: string;
  externalProviderIds: string[];
  venue: any;
  currentCategories: string[];
  currentOpeningHours: any[];
}): Promise<void> {
  const googleMapsValidationSettings =
    getEffectiveRuntimeGoogleMapsValidationSettings();
  const validation = await validateLinkedExternalProviders({
    venueName: params.venueName,
    externalProviderIds: params.externalProviderIds,
    venue: params.venue,
    currentCategories: params.currentCategories,
    currentOpeningHours: params.currentOpeningHours,
    settings: googleMapsValidationSettings,
    config: runtimeConfig?.googleMapsValidation
  });

  if (params.requestId !== externalProviderValidationRequestId) {
    return;
  }

  const latest = getLatestAnalysisState();

  if (!latest?.isVenueSelection || latest.venueId !== params.venueId) {
    return;
  }

  const retainedIssues = removeExternalProviderValidationIssues(latest.issues);
  const retainedProposals = removeExternalProviderValidationProposals(
    latest.proposals
  );
  const filteredAnalysis = applyWhitelistToAnalysis({
    venueId: latest.venueId,
    issues: [...retainedIssues, ...validation.issues],
    proposals: [...retainedProposals, ...validation.proposals]
  });

  setLatestAnalysisState({
    ...latest,
    issues: filteredAnalysis.issues,
    proposals: filteredAnalysis.proposals
  });

  if (validation.issues.length > 0) {
    logger.info(
      `Linked external provider validation found ${validation.issues.length} issue(s) for venue ${params.venueId}`
    );
  }

  renderLatestVenueAnalysis();
}

async function resolveStartupCountry(
  fallbackCountry?: string,
  attempts = 8,
  delayMs = 400
): Promise<string | undefined> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const mapCountry = getCountryFromVisibleMapContext();
    const selectionCountry = getCountryFromCurrentSelection();
    const resolved = mapCountry ?? selectionCountry;

    if (resolved) {
      logger.info(
        `Startup country resolved on attempt ${attempt}: ${normalizeCountryCode(resolved)}`
      );
      return resolved;
    }

    if (attempt < attempts) {
      await wait(delayMs);
    }
  }

  return fallbackCountry;
}

async function loadRuntimeDataForCountry(country?: string): Promise<void> {
  const normalizedCountry = normalizeCountryCode(country);
  logger.info(`Loading runtime data for country: ${normalizedCountry ?? "global"}`);

  runtimeConfig = await resolveRuntimeConfig(normalizedCountry);
  runtimeChains = await resolveRuntimeChains(normalizedCountry);
  runtimeCountry = normalizedCountry;
  await refreshRuntimeLocale();
}

function getGoogleMapsValidationAvailability() {
  return runtimeConfig
    ? resolveGoogleMapsValidationAvailability(runtimeConfig)
    : getDefaultGoogleMapsValidationAvailability();
}

function getEffectiveRuntimeGoogleMapsValidationSettings():
  | GoogleMapsValidationSettings
  | undefined {
  if (!runtimeSettings) {
    return undefined;
  }

  return getEffectiveGoogleMapsValidationSettings({
    user: runtimeSettings.googleMapsValidation,
    availability: getGoogleMapsValidationAvailability()
  });
}

function buildGoogleMapsValidationSidebarState(): {
  googleMapsValidation?: GoogleMapsValidationSettings;
  googleMapsValidationAvailability: ReturnType<
    typeof getGoogleMapsValidationAvailability
  >;
} {
  const googleMapsValidationAvailability =
    getGoogleMapsValidationAvailability();

  return {
    googleMapsValidation: getEffectiveRuntimeGoogleMapsValidationSettings(),
    googleMapsValidationAvailability
  };
}

async function setAutoScanVisibleVenues(enabled: boolean): Promise<void> {
  if (!runtimeSettings) {
    logger.warn("Cannot update auto scan setting: runtime settings unavailable");
    return;
  }

  runtimeSettings = {
    ...runtimeSettings,
    autoScanVisibleVenues: enabled
  };

  settingsManager.save(runtimeSettings);

  const sidebarState = getSidebarDebugState();

  if (sidebarState) {
    setSidebarDebugState({
      ...sidebarState,
      ...buildGoogleMapsValidationSidebarState(),
      autoScanVisibleVenues: enabled,
      lastStatus: enabled
        ? t("status.autoScanEnabled")
        : t("status.autoScanDisabled")
    });

    await rerenderSidebar();
  }
}

async function setDisableNaturalFeaturesHighlighting(
  enabled: boolean
): Promise<void> {
  if (!runtimeSettings) {
    logger.warn(
      "Cannot update NATURAL_FEATURES highlight setting: runtime settings unavailable"
    );
    return;
  }

  runtimeSettings = {
    ...runtimeSettings,
    disableNaturalFeaturesHighlighting: enabled
  };

  settingsManager.save(runtimeSettings);

  const statusText = enabled
    ? t("status.naturalFeaturesHighlighting.disabled")
    : t("status.naturalFeaturesHighlighting.enabled");
  const sidebarState = getSidebarDebugState();

  if (sidebarState) {
    setSidebarDebugState({
      ...sidebarState,
      ...buildGoogleMapsValidationSidebarState(),
      disableNaturalFeaturesHighlighting: enabled,
      lastStatus: statusText
    });

    await rerenderSidebar();
  }

  await scanVisibleVenuesFromMap("manual", statusText);
}

function hasEnabledGoogleMapsValidationChecks(): boolean {
  const checks = getEffectiveRuntimeGoogleMapsValidationSettings()?.checks;

  if (!checks) {
    return false;
  }

  return Object.values(checks).some(Boolean);
}

async function reanalyzeCurrentVenueSelection(): Promise<void> {
  const latest = getLatestAnalysisState();

  if (!latest?.isVenueSelection) {
    return;
  }

  const sdk = getWmeSdk();

  if (!sdk) {
    logger.warn("Cannot re-analyze current venue: SDK unavailable");
    return;
  }

  const venue = sdk.DataModel?.Venues?.getById?.({
    venueId: latest.venueId
  });

  if (!venue) {
    logger.warn(`Cannot re-analyze current venue: ${latest.venueId} not found`);
    return;
  }

  await analyzeVenue({
    venue
  });
}

async function setGoogleMapsValidationEnabled(enabled: boolean): Promise<void> {
  if (!runtimeSettings) {
    logger.warn(
      "Cannot update Google Maps validation setting: runtime settings unavailable"
    );
    return;
  }

  const availability = getGoogleMapsValidationAvailability();

  if (!availability.enabled) {
    logger.info(
      "Ignoring Google Maps validation toggle because runtime config disables it"
    );
    return;
  }

  runtimeSettings = {
    ...runtimeSettings,
    googleMapsValidation: {
      ...runtimeSettings.googleMapsValidation,
      enabled
    }
  };

  settingsManager.save(runtimeSettings);

  const sidebarState = getSidebarDebugState();

  if (sidebarState) {
    setSidebarDebugState({
      ...sidebarState,
      ...buildGoogleMapsValidationSidebarState(),
      lastStatus: enabled
        ? t("status.googleMapsValidation.enabled")
        : t("status.googleMapsValidation.disabled")
    });

    await rerenderSidebar();
  }

  await reanalyzeCurrentVenueSelection();
}

async function setGoogleMapsValidationCheck(
  checkKey: GoogleMapsValidationCheckKey,
  enabled: boolean
): Promise<void> {
  if (!runtimeSettings) {
    logger.warn(
      "Cannot update Google Maps validation checks: runtime settings unavailable"
    );
    return;
  }

  const availability = getGoogleMapsValidationAvailability();

  if (!availability.enabled || !availability.checks[checkKey]) {
    logger.info(
      `Ignoring Google Maps validation check toggle because runtime config disables ${checkKey}`
    );
    return;
  }

  runtimeSettings = {
    ...runtimeSettings,
    googleMapsValidation: {
      ...runtimeSettings.googleMapsValidation,
      checks: {
        ...runtimeSettings.googleMapsValidation.checks,
        [checkKey]: enabled
      }
    }
  };

  settingsManager.save(runtimeSettings);

  const sidebarState = getSidebarDebugState();

  if (sidebarState) {
    setSidebarDebugState({
      ...sidebarState,
      ...buildGoogleMapsValidationSidebarState(),
      lastStatus: t("status.googleMapsValidation.checkUpdated", {
        checkName: t(`sidebar.googleMapsValidation.${checkKey}`),
        state: enabled ? t("common.enabled") : t("common.disabled")
      })
    });

    await rerenderSidebar();
  }

  await reanalyzeCurrentVenueSelection();
}

async function rerenderSidebar(): Promise<void> {
  const state = getSidebarDebugState();

  if (!state) {
    return;
  }

  await renderSidebarDebugPanel(state);
  wireSidebarPanelActions();
  wireSidebarReloadButton(reloadData);
  wireSidebarScanButton(() => scanVisibleVenuesFromMap("manual"));
  wireSidebarAutoScanToggle(
    !!state.autoScanVisibleVenues,
    setAutoScanVisibleVenues
  );
  wireSidebarNaturalFeaturesHighlightToggle(
    !!state.disableNaturalFeaturesHighlighting,
    setDisableNaturalFeaturesHighlighting
  );
  wireSidebarGoogleMapsValidationToggle(
    state.googleMapsValidation?.enabled ?? true,
    setGoogleMapsValidationEnabled
  );
  wireSidebarGoogleMapsValidationChecks(
    state.googleMapsValidation?.checks ??
      getEffectiveRuntimeGoogleMapsValidationSettings()?.checks ??
      settingsManager.load().googleMapsValidation.checks,
    setGoogleMapsValidationCheck
  );
}

async function scanVisibleVenuesFromMap(
  trigger: "manual" | "auto" = "manual",
  statusOverride?: string
): Promise<void> {
  if (!runtimeConfig || !runtimeChains) {
    logger.warn("Cannot scan visible venues: runtime not initialized");
    return;
  }

  const venues = getVisibleVenues();
  let detectedCountry: string | undefined;
  for (const venue of venues) {
    const resolved = resolveVenueCountryCode(venue);
    if (resolved) {
      detectedCountry = resolved;
      break;
    }
  }

  const mapContextCountry = getCountryFromVisibleMapContext();
  const targetCountry = resolvePreferredCountry({
    primaryCountry: detectedCountry,
    mapContextCountry,
    runtimeCountry,
    fallbackCountry: runtimeSettings?.fallbackCountry
  });

  logger.info(
    `Scan country resolved: detected=${detectedCountry ?? "none"}, map=${mapContextCountry ?? "none"}, runtime=${runtimeCountry ?? "none"}, fallback=${normalizeCountryCode(runtimeSettings?.fallbackCountry) ?? "none"}, active=${targetCountry ?? "global"}`
  );

  if (runtimeCountry !== targetCountry) {
    await loadRuntimeDataForCountry(targetCountry);
  }

  if (!runtimeConfig || !runtimeChains) {
    logger.warn("Cannot scan visible venues: runtime not initialized");
    return;
  }

  logger.info(`Scanning ${venues.length} visible venue(s)`);

  const summary = await scanVisibleVenues({
    venues,
    runtimeConfig,
    runtimeChains,
    googleMapsValidationSettings: getEffectiveRuntimeGoogleMapsValidationSettings(),
    whitelistRuntime: getCurrentWhitelistRuntimeSnapshot() ?? undefined
  });

  const highlightRenderResult = renderHighlights(summary, venues, {
    keepExistingOnEmpty: trigger === "auto",
    disableNaturalFeaturesHighlighting:
      runtimeSettings?.disableNaturalFeaturesHighlighting === true
  });

  let statusText =
    statusOverride ??
    t("status.scannedVisibleVenues", {
      count: summary.total
    });

  if (highlightRenderResult.keptExisting) {
    statusText = t("status.autoScanKeptHighlights");
  }

  const sidebarState = getSidebarDebugState();

  if (sidebarState) {
    setSidebarDebugState({
      ...sidebarState,
      ...buildGoogleMapsValidationSidebarState(),
      runtimeConfigId: runtimeConfig.id,
      runtimeConfigVersion: runtimeConfig.version,
      runtimeChainsId: runtimeChains.id,
      runtimeChainsCount: runtimeChains.items.length,
      lastStatus: statusText,
      lastScanSummary: {
        total: summary.total,
        ok: summary.ok,
        warning: summary.warning,
        error: summary.error
      }
    });

    await rerenderSidebar();
  }
}

async function reloadData(): Promise<void> {
  if (!runtimeSettings) {
    logger.warn("Reload requested but settings not initialized");
    return;
  }

  logger.info("Reloading runtime data");

  const selectionCountry = getCountryFromCurrentSelection();
  const mapContextCountry = getCountryFromVisibleMapContext();
  const preferredCountry =
    mapContextCountry ??
    selectionCountry ??
    runtimeCountry ??
    runtimeSettings.fallbackCountry;
  logger.info(
    `Reload country context: selection=${selectionCountry ?? "none"}, map=${mapContextCountry ?? "none"}, runtime=${runtimeCountry ?? "none"}, fallback=${normalizeCountryCode(runtimeSettings.fallbackCountry) ?? "none"}, chosen=${normalizeCountryCode(preferredCountry) ?? "global"}`
  );

  runtimeManifest = await loadManifest(runtimeSettings.dataChannel);
  await loadRuntimeDataForCountry(preferredCountry);

  logger.info("Runtime data reloaded");

  const sidebarState = getSidebarDebugState();

  if (sidebarState && runtimeManifest && runtimeConfig && runtimeChains) {
    setSidebarDebugState({
      ...sidebarState,
      ...buildGoogleMapsValidationSidebarState(),
      manifestVersion: runtimeManifest.version,
      manifestRevision: runtimeManifest.dataRevision,
      runtimeConfigId: runtimeConfig.id,
      runtimeConfigVersion: runtimeConfig.version,
      runtimeChainsId: runtimeChains.id,
      runtimeChainsCount: runtimeChains.items.length,
      lastStatus: t("status.runtimeDataReloaded")
    });

    const updated = getSidebarDebugState();

    if (updated) {
      await rerenderSidebar();
    }
  }

  const latest = getLatestAnalysisState();

  if (latest?.isVenueSelection) {

    const sdk = getWmeSdk();

    if (!sdk) {
      logger.warn("Cannot re-analyze after reload: SDK unavailable");
      return;
    }

    const venue = sdk.DataModel.Venues.getById({
      venueId: latest.venueId
    });

    if (!venue) {
      logger.warn(`Cannot re-analyze venue ${latest.venueId} after reload`);
      return;
    }

    logger.info("Re-analyzing venue after runtime reload");

    await analyzeVenue({
      venue
    });
  }

}

function wireApplyButton(): void {
  const button = document.getElementById("wmeph-row-apply-selected");

  if (!button) {
    return;
  }

  button.onclick = async () => {
    const latest = getLatestAnalysisState();

    if (!latest?.isVenueSelection) {
      logger.warn("Apply clicked, but no venue analysis state is available");
      return;
    }

    const selected = getSelectedProposals(latest.proposals);
    const includesExternalProviderProposal = selected.some(
      (proposal) => proposal.field === "externalProviderIds"
    );

    const result = await applyVenueProposals(
      latest.venueId,
      latest.currentServices,
      latest.currentAliases,
      selected
    );

    logger.info(
      `Apply result: applied=${result.applied}, skipped=${result.skipped}, errors=${result.errors.length}`
    );

    for (const error of result.errors) {
      logger.error(`Apply error: ${error}`);
    }

    const currentState = getLatestAnalysisState();
    if (currentState) {
      let statusMessage;

      if (result.errors.length > 0) {
        statusMessage = {
          kind: "error" as const,
          text: t("status.apply.failedSomeFixes", {
            errorCount: result.errors.length
          })
        };
      } else if (result.applied > 0) {
        statusMessage = {
          kind: "success" as const,
          text: includesExternalProviderProposal
            ? t("status.apply.appliedWithExternalProvider", {
                appliedCount: result.applied,
                skippedCount: result.skipped
              })
            : t("status.apply.applied", {
                appliedCount: result.applied,
                skippedCount: result.skipped
              })
        };
      } else {
        statusMessage = {
          kind: "warning" as const,
          text: t("status.apply.noneSelected")
        };
      }

      setLatestAnalysisState({
        ...currentState,
        statusMessage
      });
    }

    const sdk = getWmeSdk();

    if (!sdk) {
      logger.warn("Cannot re-analyze after apply: SDK unavailable");
      return;
    }

    if (includesExternalProviderProposal) {
      await wait(500);
    }

    const refreshedVenue = sdk.DataModel.Venues.getById({ venueId: latest.venueId });

    if (!refreshedVenue) {
      logger.warn(`Cannot re-analyze after apply: venue ${latest.venueId} not found`);
      return;
    }

    await analyzeVenue({
      venue: refreshedVenue
    });
  };
}

function buildWhitelistEntriesForGroup(params: {
  venueId: string;
  chainId: string | null;
  issues: PlaceIssue[];
}): WhitelistEntry[] {
  const whitelistRuntime = getCurrentWhitelistRuntimeSnapshot();

  if (!whitelistRuntime) {
    return [];
  }

  const now = new Date().toISOString();
  const entries = new Map<string, WhitelistEntry>();

  for (const issue of params.issues) {
    if (!issue.ruleId) {
      continue;
    }

    const entry: WhitelistEntry = {
      placeId: params.venueId,
      ruleId: issue.ruleId,
      field: issue.field,
      scope: "place",
      createdAt: now,
      reason: "Locally ignored from the feature editor",
      chainId: params.chainId ?? undefined,
      country: runtimeCountry,
      configId: whitelistRuntime.configId,
      configVersion: whitelistRuntime.configVersion,
      chainsId: whitelistRuntime.chainsId,
      chainsVersion: whitelistRuntime.chainsVersion
    };

    entries.set(`${entry.placeId}::${entry.ruleId}::${entry.field}`, entry);
  }

  return Array.from(entries.values());
}

async function finalizePendingWhitelistAction(
  action: PendingWhitelistAction
): Promise<void> {
  const changedCount = upsertWhitelistEntries(action.entries);
  const latest = getLatestAnalysisState();

  if (latest?.isVenueSelection && latest.venueId === action.venueId) {
    const filteredAnalysis = applyWhitelistToAnalysis({
      venueId: latest.venueId,
      issues: latest.issues,
      proposals: latest.proposals
    });

    setLatestAnalysisState({
      ...latest,
      issues: filteredAnalysis.issues,
      proposals: filteredAnalysis.proposals,
      statusMessage: {
        kind: "success",
        text:
          changedCount > 0
            ? t("status.whitelist.ignored", {
                count: action.entries.length
              })
            : t("status.whitelist.alreadyIgnored")
      }
    });

    renderLatestVenueAnalysis();
  }

  await scanVisibleVenuesFromMap("manual");
}

function wireWhitelistButtons(): void {
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>(".wmeph-row-whitelist-issue")
  );

  if (buttons.length === 0) {
    return;
  }

  for (const button of buttons) {
    button.onclick = async () => {
      button.setAttribute("disabled", "true");

      try {
        const latest = getLatestAnalysisState();

        if (!latest?.isVenueSelection) {
          logger.warn("Whitelist clicked, but no venue analysis state is available");
          return;
        }

        const groupKey = button.dataset.groupKey;

        if (!groupKey) {
          logger.warn("Whitelist clicked without an issue-group key");
          return;
        }

        const group = groupIssuesForFeatureEditor(
          latest.issues,
          latest.proposals
        ).find((candidate) => candidate.key === groupKey);

        if (!group) {
          logger.warn(`Whitelist group not found: ${groupKey}`);
          return;
        }

        const entries = buildWhitelistEntriesForGroup({
          venueId: latest.venueId,
          chainId: latest.chainId,
          issues: group.issues
        });

        if (entries.length === 0) {
          logger.warn(`Whitelist group ${groupKey} has no rule-bound issues`);
          return;
        }

        schedulePendingWhitelistAction({
          venueId: latest.venueId,
          groupKey,
          severity: group.severity,
          message: group.message,
          field: group.field,
          entries,
          onExpire: (action) => {
            void finalizePendingWhitelistAction(action);
          }
        });

        renderLatestVenueAnalysis();
      } finally {
        button.removeAttribute("disabled");
      }
    };
  }
}

function wireUndoWhitelistButtons(): void {
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>(".wmeph-row-undo-whitelist")
  );

  if (buttons.length === 0) {
    return;
  }

  for (const button of buttons) {
    button.onclick = () => {
      const latest = getLatestAnalysisState();

      if (!latest?.isVenueSelection) {
        logger.warn("Undo whitelist clicked, but no venue analysis state is available");
        return;
      }

      const groupKey = button.dataset.groupKey;

      if (!groupKey) {
        logger.warn("Undo whitelist clicked without an issue-group key");
        return;
      }

      const canceledAction = cancelPendingWhitelistAction({
        venueId: latest.venueId,
        groupKey
      });

      if (!canceledAction) {
        logger.warn(`Pending whitelist group not found: ${groupKey}`);
        return;
      }

      renderLatestVenueAnalysis();
    };
  }
}

async function analyzeVenue(params: {
  venue: any;
}): Promise<void> {
  const { venue } = params;

  logger.info(`Selected venue: ${venue.name}`);

  const place = mapVenueToPlaceLike(venue);
  const venueCountry = resolveVenueCountryCode(venue);
  const mapContextCountry = getCountryFromVisibleMapContext();
  const targetCountry = resolvePreferredCountry({
    primaryCountry: venueCountry ?? place.country,
    mapContextCountry,
    runtimeCountry,
    fallbackCountry: runtimeSettings?.fallbackCountry
  });
  place.country = targetCountry;

  logger.info(
    `Country resolved: venue=${venueCountry ?? "none"}, map=${mapContextCountry ?? "none"}, runtime=${runtimeCountry ?? "none"}, fallback=${normalizeCountryCode(runtimeSettings?.fallbackCountry) ?? "none"}, active=${targetCountry ?? "global"}`
  );

  logger.info(
    `Venue contact fields: rawPhone=${venue.phone ?? "none"}, rawUrl=${venue.url ?? "none"}, mappedPhone=${place.phone ?? "none"}, mappedUrl=${place.url ?? "none"}`
  );

  if (runtimeCountry !== targetCountry || !runtimeConfig || !runtimeChains) {
    await loadRuntimeDataForCountry(targetCountry);
  }

  if (!runtimeConfig || !runtimeChains) {
    logger.warn("Cannot analyze venue: runtime not initialized");
    return;
  }

  const matchResult = matchPlaceToChain(place, runtimeChains);

  if (matchResult.matched && matchResult.chain) {
    logger.info(
      `Chain match found: ${matchResult.chain.id} via ${matchResult.method}`
    );
  }

  const categoryStandards = resolveCategoryStandards(
    runtimeConfig,
    place.categories ?? []
  );

  const effectivePolicy = resolveEffectivePolicy({
    categoryStandards,
    chainPolicy: matchResult.chain?.policy
  });

  logger.info(
    `Effective policy resolved: ${JSON.stringify(effectivePolicy)}`
  );
  logger.info(
    `Formatting config loaded: phone=${runtimeConfig.formatting?.phone ? "yes" : "no"}, url=${runtimeConfig.formatting?.url ? "yes" : "no"}`
  );

  const issues = evaluatePlace(place, effectivePolicy, matchResult.chain, {
    cityInVenueNameRule: runtimeConfig.rules?.cityInVenueName,
    phoneFormatting: runtimeConfig.formatting?.phone,
    urlFormatting: runtimeConfig.formatting?.url
  });
  const editorLockLevel = getCurrentEditorLockLevel();
  const proposals = generateProposals(issues, { editorLockLevel });
  const filteredAnalysis = applyWhitelistToAnalysis({
    venueId: String(venue.id),
    issues,
    proposals
  });

  for (const issue of issues) {
    logger.info(
      `[ISSUE] ${issue.severity.toUpperCase()} ${issue.field}: ${issue.message}`
    );
  }

  if (editorLockLevel !== undefined) {
    logger.info(`Editor lock level resolved: ${editorLockLevel}`);
  }

  const sidebarState = getSidebarDebugState();
  if (sidebarState) {
    setSidebarDebugState({
      ...sidebarState,
      ...buildGoogleMapsValidationSidebarState(),
      runtimeConfigId: runtimeConfig.id,
      runtimeConfigVersion: runtimeConfig.version,
      runtimeChainsId: runtimeChains.id,
      runtimeChainsCount: runtimeChains.items.length,
      lastStatus: t("status.analyzedVenue", {
        placeName: place.name,
        findings: formatAnalysisCountLabel(filteredAnalysis.issues)
      })
    });

    const updatedSidebarState = getSidebarDebugState();
    if (updatedSidebarState) {
      await rerenderSidebar();
    }
  }

  const previous = getLatestAnalysisState();

  setLatestAnalysisState({
    venueId: String(venue.id),
    placeName: place.name,
    chainId: matchResult.chain?.id ?? null,
    issues: filteredAnalysis.issues,
    proposals: filteredAnalysis.proposals,
    currentServices: place.services ?? [],
    currentAliases: place.aliases ?? [],
    currentExternalProviderIds: place.externalProviderIds ?? [],
    isVenueSelection: true,
    statusMessage: previous?.statusMessage
  });

  retryEnsureFeatureEditorContainer(() => {
    const latest = getLatestAnalysisState();
    return !!latest?.isVenueSelection;
  });

  renderLatestVenueAnalysis();

  urlAvailabilityRequestId += 1;
  const hasUrlFormatIssue = issues.some(
    (issue) => issue.ruleId === "urlValidation.format"
  );

  if ((place.url ?? "").trim().length > 0 && !hasUrlFormatIssue) {
    void refreshUrlAvailabilityValidation({
      requestId: urlAvailabilityRequestId,
      venueId: String(venue.id),
      url: place.url!.trim()
    });
  }

  externalProviderSuggestionRequestId += 1;
  const suggestionIssue = findMissingExternalProviderIssue(issues);

  if (suggestionIssue) {
    void refreshExternalProviderSuggestions({
      requestId: externalProviderSuggestionRequestId,
      venue,
      issue: suggestionIssue,
      query: place.name
    });
  }

  externalProviderValidationRequestId += 1;
  const effectiveGoogleMapsValidation =
    getEffectiveRuntimeGoogleMapsValidationSettings();
  if (
    effectiveGoogleMapsValidation?.enabled &&
    hasEnabledGoogleMapsValidationChecks() &&
    (place.externalProviderIds ?? []).length > 0
  ) {
    void refreshExternalProviderValidation({
      requestId: externalProviderValidationRequestId,
      venueId: String(venue.id),
      venueName: place.name,
      externalProviderIds: place.externalProviderIds ?? [],
      venue,
      currentCategories: place.categories ?? [],
      currentOpeningHours: place.openingHours ?? []
    });
  }
}

export async function startApplication(): Promise<void> {
  logger.info(`Starting ${APP_NAME}`);

  const settings = settingsManager.load();
  runtimeSettings = settings;
  logger.info(`Loaded settings for channel: ${settings.dataChannel}`);
  logger.info(
    `Runtime source: scriptBuild=${SCRIPT_BUILD_CHANNEL}, dataBranch=${DATA_REPOSITORY_BRANCH}, dataChannel=${settings.dataChannel}`
  );

  try {
    await waitForWmeSdkReady();
    logger.info("WME context is ready");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown WME SDK readiness error";
    logger.warn(`WME context is not ready: ${message}`);
    return;
  }

  try {
    await waitForInitialMapDataLoaded();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown initial map data readiness error";
    logger.warn(`Initial map data not ready yet: ${message}`);
  }

  mountSidebarPlaceholder();

  const manifest = await loadManifest(settings.dataChannel);
  runtimeManifest = manifest;
  logger.info(
    `Active manifest loaded: ${manifest.channel} / ${manifest.version} / ${manifest.dataRevision}`
  );

  const selectionCountry = getCountryFromCurrentSelection();
  const mapContextCountry = getCountryFromVisibleMapContext();
  const initialCountry = await resolveStartupCountry(settings.fallbackCountry);
  logger.info(
    `Startup country context: selection=${selectionCountry ?? "none"}, map=${mapContextCountry ?? "none"}, fallback=${normalizeCountryCode(settings.fallbackCountry) ?? "none"}, chosen=${normalizeCountryCode(initialCountry) ?? "global"}`
  );
  await loadRuntimeDataForCountry(initialCountry);

  if (!runtimeConfig || !runtimeChains) {
    logger.warn("Runtime data failed to initialize");
    return;
  }

  logger.info(
    `Runtime config loaded: ${runtimeConfig.id} v${runtimeConfig.version}`
  );

  logger.info(
    `Runtime chains loaded: ${runtimeChains.id} with ${runtimeChains.items.length} items`
  );

  setSidebarDebugState({
    scriptName: t("app.name"),
    dataChannel: settings.dataChannel,
    manifestVersion: manifest.version,
    manifestRevision: manifest.dataRevision,
    runtimeConfigId: runtimeConfig.id,
    runtimeConfigVersion: runtimeConfig.version,
    runtimeChainsId: runtimeChains.id,
    runtimeChainsCount: runtimeChains.items.length,
    lastStatus: t("status.ready"),
    highlightsEnabled: true,
    autoScanVisibleVenues: runtimeSettings?.autoScanVisibleVenues ?? true,
    disableNaturalFeaturesHighlighting:
      runtimeSettings?.disableNaturalFeaturesHighlighting ?? false,
    ...buildGoogleMapsValidationSidebarState()
  });

  const sidebarState = getSidebarDebugState();
  if (sidebarState) {
    await rerenderSidebar();
  }

  wireSidebarReloadButton(reloadData);

  ensureHighlightLayer();

  registerAutoScanListeners(
    () => !!runtimeSettings?.autoScanVisibleVenues,
    () => scanVisibleVenuesFromMap("auto")
  );
  registerVenueSaveScanListener(() => scanVisibleVenuesFromMap("manual"));

  logger.info("Registering selected venue analysis flow");

  onFeatureEditorOpened(() => {
    const latest = getLatestAnalysisState();

    if (!latest?.isVenueSelection) {
      logger.info("Feature editor opened, but current analysis state is not a venue");
      removeFeatureEditorContainer();
      return;
    }

    retryEnsureFeatureEditorContainer(() => {
      const current = getLatestAnalysisState();
      return !!current?.isVenueSelection;
    });

    renderLatestVenueAnalysis();
  });

  onVenueSelected(
    async (venue) => {
      await analyzeVenue({
        venue
      });
    },
    async () => {
      logger.info("Selection is not a venue, hiding Place Harmonizer block");
      externalProviderSuggestionRequestId += 1;
      clearLatestAnalysisState();
      const sidebarState = getSidebarDebugState();
      if (sidebarState) {
        setSidebarDebugState({
          ...sidebarState,
          ...buildGoogleMapsValidationSidebarState(),
          lastStatus: t("status.selectionNotVenue")
        });

        const updatedSidebarState = getSidebarDebugState();
        if (updatedSidebarState) {
          await rerenderSidebar();
        }
      }
      removeFeatureEditorContainer();
    }
  );

}
