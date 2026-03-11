import { logger } from "../../logging/logger";
import { getWmeSdk } from "./wme";
import type { PlaceProposal } from "../../types/proposal";

interface ApplyResult {
  applied: number;
  skipped: number;
  errors: string[];
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

function buildUpdateArgs(
  venueId: string,
  currentServices: string[],
  proposals: PlaceProposal[]
): Record<string, unknown> {
  const args: Record<string, unknown> = { venueId };

  const serviceProposals = proposals.filter(
    (proposal) => proposal.field === "services" && proposal.isApplySupported
  );

  if (serviceProposals.length > 0) {
    args.services = buildUpdatedServices(currentServices, serviceProposals);
  }

  for (const proposal of proposals) {
    if (!proposal.isApplySupported) {
      continue;
    }

    if (proposal.field === "services") {
      continue;
    }

    switch (proposal.field) {
      case "name":
        args.name = proposal.proposedValue as string;
        break;
      case "phone":
        args.phone = proposal.proposedValue as string;
        break;
      case "url":
        args.url = proposal.proposedValue as string;
        break;
      case "openingHours":
        args.openingHours = proposal.proposedValue as unknown[];
        break;
      default:
        break;
    }
  }

  return args;
}

export function applyVenueProposals(
  venueId: string,
  currentServices: string[],
  proposals: PlaceProposal[]
): ApplyResult {
  const sdk = getWmeSdk();

  if (!sdk) {
    return {
      applied: 0,
      skipped: proposals.length,
      errors: ["WME SDK is not available"]
    };
  }

  const supported = proposals.filter((proposal) => proposal.isApplySupported);
  const skipped = proposals.length - supported.length;

  if (supported.length === 0) {
    return {
      applied: 0,
      skipped,
      errors: []
    };
  }

  const args = buildUpdateArgs(venueId, currentServices, supported);

  try {
    sdk.DataModel.Venues.updateVenue(args);
    logger.info(`Applied ${supported.length} proposal(s) to venue ${venueId}`);

    return {
      applied: supported.length,
      skipped,
      errors: []
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown apply error";

    logger.error(`Failed to apply proposals: ${message}`);

    return {
      applied: 0,
      skipped,
      errors: [message]
    };
  }
}