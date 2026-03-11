import { logger } from "../../logging/logger";
import { getWmeSdk } from "./wme";

function processCurrentSelection(callback: (venue: any) => void): void {
  const sdk = getWmeSdk();

  if (!sdk) {
    logger.warn("Cannot process selection: SDK unavailable");
    return;
  }

  const selection = sdk.Editing.getSelection();

  if (!selection) {
    logger.info("No current selection");
    return;
  }

  logger.info(
    `Selection detected: type=${selection.objectType}, ids=${JSON.stringify(selection.ids)}`
  );

  if (selection.objectType !== "venue") {
    logger.info(`Current selection is not a venue: ${selection.objectType}`);
    return;
  }

  const venueId = selection.ids?.[0];

  if (!venueId) {
    logger.warn("Venue selection exists, but no venue id was found");
    return;
  }

  const venue = sdk.DataModel.Venues.getById({ venueId });

  if (!venue) {
    logger.warn(`Selected venue ${venueId} not found in SDK data model`);
    return;
  }

  logger.info(`Venue selected via SDK: ${venue.name} (${venueId})`);

  callback(venue);
}

export function onVenueSelected(callback: (venue: any) => void): void {
  const sdk = getWmeSdk();

  if (!sdk) {
    logger.warn("WME SDK not available when registering venue selection listener");
    return;
  }

  sdk.Events.on({
    eventName: "wme-selection-changed",
    eventHandler: () => {
      logger.info("Received wme-selection-changed event");
      processCurrentSelection(callback);
    }
  });

  logger.info("Venue selection listener registered via SDK");

  // Ook meteen de huidige selectie verwerken.
  processCurrentSelection(callback);
}