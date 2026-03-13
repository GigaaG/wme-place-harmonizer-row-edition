import { APP_NAME } from "../constants/app";
import { BUILD_MODE, IS_DEV_SCRIPT_BUILD } from "../constants/build";
import { logger } from "../logging/logger";
import { settingsManager } from "../settings/manager";
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
import {
  waitForWmeSdkReady,
  waitForInitialMapDataLoaded,
  getCurrentEditorLockLevel,
  getWmeSdk
} from "../integration/sdk/wme";
import { onFeatureEditorOpened } from "../integration/sdk/feature-editor";
import { renderFeatureEditorAnalysis } from "../ui/feature-editor/renderer";
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
import { setSidebarDebugState, getSidebarDebugState } from "./app-state";
import { renderSidebarDebugPanel } from "../ui/sidebar/renderer";
import { wireSidebarPanelActions, wireSidebarReloadButton } from "../ui/sidebar/actions";
import { getVisibleVenues } from "../integration/sdk/visible-venues";
import { scanVisibleVenues } from "./scan-visible-venues";
import { wireSidebarScanButton } from "../ui/sidebar/actions";
import { ensureHighlightLayer, renderHighlights } from "../highlighter/highlighter-manager";
import { registerAutoScanListeners } from "../integration/sdk/map-auto-scan";
import { wireSidebarAutoScanToggle } from "../ui/sidebar/actions";
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

//
// Runtime containers
//

let runtimeManifest: any | null = null;
let runtimeConfig: any | null = null;
let runtimeChains: any | null = null;
let runtimeSettings: any | null = null;
let runtimeCountry: string | undefined;
let externalProviderSuggestionRequestId = 0;

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

function renderLatestVenueAnalysis(): void {
  const latest = getLatestAnalysisState();

  if (!latest?.isVenueSelection) {
    return;
  }

  renderFeatureEditorAnalysis(
    latest.placeName,
    latest.chainId,
    latest.issues,
    latest.proposals,
    latest.statusMessage
  );
  wireApplyButton();
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

  setLatestAnalysisState({
    ...latest,
    issues: issuesWithSuggestion,
    proposals: [...retainedProposals, ...suggestionProposals]
  });

  logger.info(
    suggestions.length > 0
      ? `Found ${suggestions.length} external provider suggestion(s) for venue ${params.venue.id}`
      : `No nearby external provider suggestions found for venue ${params.venue.id}`
  );

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
      autoScanVisibleVenues: enabled,
      lastStatus: enabled
        ? "Auto scan enabled"
        : "Auto scan disabled"
    });

    await rerenderSidebar();
  }
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
}

async function scanVisibleVenuesFromMap(
  trigger: "manual" | "auto" = "manual"
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

  const summary = scanVisibleVenues({
    venues,
    runtimeConfig,
    runtimeChains
  });

  const highlightRenderResult = renderHighlights(summary, venues, {
    keepExistingOnEmpty: trigger === "auto"
  });

  let statusText = `Scanned ${summary.total} visible venue(s)`;

  if (highlightRenderResult.keptExisting) {
    statusText = "Auto scan found no drawable venues; keeping previous highlights";
  }

  const sidebarState = getSidebarDebugState();

  if (sidebarState) {
    setSidebarDebugState({
      ...sidebarState,
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
      manifestVersion: runtimeManifest.version,
      manifestRevision: runtimeManifest.dataRevision,
      runtimeConfigId: runtimeConfig.id,
      runtimeConfigVersion: runtimeConfig.version,
      runtimeChainsId: runtimeChains.id,
      runtimeChainsCount: runtimeChains.items.length,
      lastStatus: "Runtime data reloaded"
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
          text: `Failed to apply some fixes (${result.errors.length} error(s))`
        };
      } else if (result.applied > 0) {
        statusMessage = {
          kind: "success" as const,
          text: includesExternalProviderProposal
            ? `Applied ${result.applied} fix(es), skipped ${result.skipped}. External provider selection was sent through the editor autocomplete.`
            : `Applied ${result.applied} fix(es), skipped ${result.skipped}`
        };
      } else {
        statusMessage = {
          kind: "warning" as const,
          text: "No supported fixes were selected"
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
      runtimeConfigId: runtimeConfig.id,
      runtimeConfigVersion: runtimeConfig.version,
      runtimeChainsId: runtimeChains.id,
      runtimeChainsCount: runtimeChains.items.length,
      lastStatus: `Analyzed venue: ${place.name} (${issues.length} issue(s))`
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
    issues,
    proposals,
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
}

export async function startApplication(): Promise<void> {
  logger.info(`Starting ${APP_NAME}`);

  const settings = settingsManager.load();
  runtimeSettings = settings;
  logger.info(`Loaded settings for channel: ${settings.dataChannel}`);
  logger.info(
    `Runtime source: buildMode=${BUILD_MODE}, scriptBuild=${IS_DEV_SCRIPT_BUILD ? "dev" : "prod"}, dataBranch=${DATA_REPOSITORY_BRANCH}, dataChannel=${settings.dataChannel}`
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
    scriptName: "WME Place Harmonizer ROW Edition",
    dataChannel: settings.dataChannel,
    manifestVersion: manifest.version,
    manifestRevision: manifest.dataRevision,
    runtimeConfigId: runtimeConfig.id,
    runtimeConfigVersion: runtimeConfig.version,
    runtimeChainsId: runtimeChains.id,
    runtimeChainsCount: runtimeChains.items.length,
    lastStatus: "Ready",
    highlightsEnabled: true,
    autoScanVisibleVenues: runtimeSettings?.autoScanVisibleVenues ?? true
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
          lastStatus: "Selection is not a venue"
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
