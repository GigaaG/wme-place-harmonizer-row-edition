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
import { waitForWmeSdkReady } from "../integration/sdk/wme";
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

export async function startApplication(): Promise<void> {
  logger.info(`Starting ${APP_NAME}`);

  const settings = settingsManager.load();
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
      latest.proposals
    );
  });

  onVenueSelected(
    async (venue) => {
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

      setLatestAnalysisState({
        placeName: place.name,
        chainId: matchResult.chain?.id ?? null,
        issues,
        proposals,
        isVenueSelection: true
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
          latest.proposals
        );
      }
    },
    () => {
      logger.info("Selection is not a venue, hiding Place Harmonizer block");
      clearLatestAnalysisState();
      removeFeatureEditorContainer();
    }
  );

}