import { APP_NAME } from "../constants/app";
import { logger } from "../logging/logger";
import { settingsManager } from "../settings/manager";
import { getWmeContext } from "../integration/sdk/wme";
import { mountSidebarPlaceholder } from "../integration/sdk/sidebar";
import { loadManifest } from "../config/manifest-loader";
import { resolveRuntimeConfig } from "../config/runtime-config";
import { resolveRuntimeChains } from "../config/runtime-chains";
import { matchPlaceToChain } from "../matching/chain-matcher";
import type { PlaceLike } from "../types/place";
import { resolveCategoryStandards } from "../config/category-standards";
import { resolveEffectivePolicy } from "../config/effective-policy";
import { onVenueSelected } from "../integration/sdk/venue-selection";
import { mapVenueToPlaceLike } from "../integration/sdk/venue-mapper";
import { evaluatePlace } from "../rules/evaluate-place";
import { waitForWmeSdkReady, getWmeSdk } from "../integration/sdk/wme";
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

//
// Runtime containers
//

let runtimeManifest: any | null = null;
let runtimeConfig: any | null = null;
let runtimeChains: any | null = null;
let runtimeSettings: any | null = null;

//
// Functions
//

async function reloadData(): Promise<void> {
  if (!runtimeSettings) {
    logger.warn("Reload requested but settings not initialized");
    return;
  }

  logger.info("Reloading runtime data");

  runtimeManifest = await loadManifest(runtimeSettings.dataChannel);
  runtimeConfig = await resolveRuntimeConfig();
  runtimeChains = await resolveRuntimeChains();

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
      await renderSidebarDebugPanel(updated);
      wireSidebarPanelActions();
      wireSidebarReloadButton(reloadData);
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
      venue,
      runtimeConfig,
      runtimeChains
    });
  }

}

function wireApplyButton(runtimeConfig: any, runtimeChains: any): void {
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

    const result = applyVenueProposals(
      latest.venueId,
      latest.currentServices,
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
          text: `Applied ${result.applied} fix(es), skipped ${result.skipped}`
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

    const refreshedVenue = sdk.DataModel.Venues.getById({ venueId: latest.venueId });

    if (!refreshedVenue) {
      logger.warn(`Cannot re-analyze after apply: venue ${latest.venueId} not found`);
      return;
    }

    await analyzeVenue({
      venue: refreshedVenue,
      runtimeConfig,
      runtimeChains
    });
  };
}

async function analyzeVenue(params: {
  venue: any;
  runtimeConfig: any;
  runtimeChains: any;
}): Promise<void> {
  const { venue, runtimeConfig, runtimeChains } = params;

  logger.info(`Selected venue: ${venue.name}`);

  const place = mapVenueToPlaceLike(venue);

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

  const issues = evaluatePlace(place, effectivePolicy, matchResult.chain);
  const proposals = generateProposals(issues);

  for (const issue of issues) {
      logger.info(
        `[ISSUE] ${issue.severity.toUpperCase()} ${issue.field}: ${issue.message}`
      );
    }

    const sidebarState = getSidebarDebugState();
  if (sidebarState) {
    setSidebarDebugState({
      ...sidebarState,
      lastStatus: `Analyzed venue: ${place.name} (${issues.length} issue(s))`
    });

    const updatedSidebarState = getSidebarDebugState();
    if (updatedSidebarState) {
      await renderSidebarDebugPanel(updatedSidebarState);
      wireSidebarPanelActions();
      wireSidebarReloadButton(reloadData);
    }
  }

  const previous = getLatestAnalysisState();

  setLatestAnalysisState({
    venueId: venue.id,
    placeName: place.name,
    chainId: matchResult.chain?.id ?? null,
    issues,
    proposals,
    currentServices: place.services ?? [],
    isVenueSelection: true,
    statusMessage: previous?.statusMessage
  });

  retryEnsureFeatureEditorContainer(() => {
    const latest = getLatestAnalysisState();
    return !!latest?.isVenueSelection;
  });

  const latest = getLatestAnalysisState();
  if (latest?.isVenueSelection) {
    renderFeatureEditorAnalysis(
      latest.placeName,
      latest.chainId,
      latest.issues,
      latest.proposals,
      latest.statusMessage
    );
    wireApplyButton(params.runtimeConfig, params.runtimeChains);
  }
}

export async function startApplication(): Promise<void> {
  logger.info(`Starting ${APP_NAME}`);

  const settings = settingsManager.load();
  runtimeSettings = settings;
  logger.info(`Loaded settings for channel: ${settings.dataChannel}`);

  try {
    await waitForWmeSdkReady();
    logger.info("WME context is ready");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown WME SDK readiness error";
    logger.warn(`WME context is not ready: ${message}`);
    return;
  }

  mountSidebarPlaceholder();

  const manifest = await loadManifest(settings.dataChannel);
  runtimeManifest = manifest;
  logger.info(
    `Active manifest loaded: ${manifest.channel} / ${manifest.version} / ${manifest.dataRevision}`
  );

  const runtimeConfig = await resolveRuntimeConfig();
  logger.info(
    `Runtime config loaded: ${runtimeConfig.id} v${runtimeConfig.version}`
  );

  const runtimeChains = await resolveRuntimeChains();
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
    lastStatus: "Ready"
  });

  const sidebarState = getSidebarDebugState();
  if (sidebarState) {
    await renderSidebarDebugPanel(sidebarState);
    wireSidebarPanelActions();
    wireSidebarReloadButton(reloadData);
  }

  wireSidebarReloadButton(reloadData);

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

    renderFeatureEditorAnalysis(
      latest.placeName,
      latest.chainId,
      latest.issues,
      latest.proposals,
      latest.statusMessage
    );
    wireApplyButton(runtimeConfig, runtimeChains);
  });

  onVenueSelected(
    async (venue) => {
      await analyzeVenue({
        venue,
        runtimeConfig,
        runtimeChains
      });
    },
    async () => {
      logger.info("Selection is not a venue, hiding Place Harmonizer block");
      clearLatestAnalysisState();
      const sidebarState = getSidebarDebugState();
      if (sidebarState) {
        setSidebarDebugState({
          ...sidebarState,
          lastStatus: "Selection is not a venue"
        });

        const updatedSidebarState = getSidebarDebugState();
        if (updatedSidebarState) {
          await renderSidebarDebugPanel(updatedSidebarState);
          wireSidebarPanelActions();
          wireSidebarReloadButton(reloadData);
        }
      }
      removeFeatureEditorContainer();
    }
  );

}