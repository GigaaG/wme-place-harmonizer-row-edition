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

export async function startApplication(): Promise<void> {
  logger.info(`Starting ${APP_NAME}`);

  const settings = settingsManager.load();
  logger.info(`Loaded settings for channel: ${settings.dataChannel}`);

  const wmeContext = getWmeContext();
  if (!wmeContext.isReady) {
    logger.warn("WME context is not ready");
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

    const testPlace: PlaceLike = {
    name: "Mc Donalds",
    categories: ["FAST_FOOD"]
  };

  const matchResult = matchPlaceToChain(testPlace, runtimeChains);

  if (matchResult.matched && matchResult.chain) {
    logger.info(
      `Chain match found: ${matchResult.chain.id} via ${matchResult.method} (${matchResult.matchedValue ?? "n/a"})`
    );
  } else {
    logger.info("No chain match found for test place");
  }
}