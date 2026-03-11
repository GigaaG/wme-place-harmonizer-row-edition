import { logger } from "../../logging/logger";
import { getWmeSdk } from "./wme";

function processCurrentSelection(
  onVenue: (venue: any) => void,
  onNonVenue: () => void
): void {
  const sdk = getWmeSdk();

  if (!sdk) {
    logger.warn("Cannot process selection: SDK unavailable");
    onNonVenue();
    return;
  }

  const selection = sdk.Editing.getSelection();

  if (!selection) {
    logger.info("No current selection");
    onNonVenue();
    return;
  }

  logger.info(
    `Selection detected: type=${selection.objectType}, ids=${JSON.stringify(selection.ids)}`
  );

  if (selection.objectType !== "venue") {
    logger.info(`Current selection is not a venue: ${selection.objectType}`);
    onNonVenue();
    return;
  }

  const venueId = selection.ids?.[0];

  if (!venueId) {
    logger.warn("Venue selection exists, but no venue id was found");
    onNonVenue();
    return;
  }

  const venue = sdk.DataModel.Venues.getById({ venueId });

  if (!venue) {
    logger.warn(`Selected venue ${venueId} not found in SDK data model`);
    onNonVenue();
    return;
  }

  logger.info(`Venue selected via SDK: ${venue.name} (${venueId})`);

  onVenue(venue);
}

export function onVenueSelected(
  onVenue: (venue: any) => void,
  onNonVenue: () => void
): void {
  const sdk = getWmeSdk();

  if (!sdk) {
    logger.warn("WME SDK not available when registering venue selection listener");
    return;
  }

  sdk.Events.on({
    eventName: "wme-selection-changed",
    eventHandler: () => {
      logger.info("Received wme-selection-changed event");
      processCurrentSelection(onVenue, onNonVenue);
    }
  });

  logger.info("Venue selection listener registered via SDK");

  processCurrentSelection(onVenue, onNonVenue);
}