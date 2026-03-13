import { logger } from "../../logging/logger";
import { getCurrentEditorLockLevel, getWmeSdk } from "./wme";
import type { PlaceProposal } from "../../types/proposal";
import { applyExternalProviderProposalInEditor } from "./external-provider-editor";

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

function buildUpdatedAliases(
  currentAliases: string[],
  proposals: PlaceProposal[]
): string[] {
  const result = new Set(currentAliases);

  for (const proposal of proposals) {
    if (proposal.field !== "aliases" || !proposal.aliasName) {
      continue;
    }

    if (proposal.actionType === "add-alias") {
      result.add(proposal.aliasName);
    }

    if (proposal.actionType === "remove-alias") {
      result.delete(proposal.aliasName);
    }
  }

  return Array.from(result.values());
}

function buildUpdateArgs(
  venueId: string,
  currentServices: string[],
  currentAliases: string[],
  proposals: PlaceProposal[],
  editorLockLevel?: number
): Record<string, unknown> {
  const args: Record<string, unknown> = { venueId };

  const serviceProposals = proposals.filter(
    (proposal) => proposal.field === "services" && proposal.isApplySupported
  );

  if (serviceProposals.length > 0) {
    args.services = buildUpdatedServices(currentServices, serviceProposals);
  }

  const aliasProposals = proposals.filter(
    (proposal) => proposal.field === "aliases" && proposal.isApplySupported
  );

  if (aliasProposals.length > 0) {
    args.aliases = buildUpdatedAliases(currentAliases, aliasProposals);
  }

  for (const proposal of proposals) {
    if (!proposal.isApplySupported) {
      continue;
    }

    if (proposal.field === "services" || proposal.field === "aliases") {
      continue;
    }

    switch (proposal.field) {
      case "name":
        args.name = proposal.proposedValue as string;
        break;
      case "lockLevel": {
        const requestedLockLevel = proposal.proposedValue;

        if (
          typeof requestedLockLevel === "number" &&
          Number.isInteger(requestedLockLevel) &&
          requestedLockLevel >= 1
        ) {
          const appliedLockLevel =
            typeof editorLockLevel === "number"
              ? Math.min(requestedLockLevel, editorLockLevel)
              : requestedLockLevel;

          args.lockRank = appliedLockLevel - 1;
        }
        break;
      }
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

export async function applyVenueProposals(
  venueId: string,
  currentServices: string[],
  currentAliases: string[],
  proposals: PlaceProposal[]
): Promise<ApplyResult> {
  const supported = proposals.filter((proposal) => proposal.isApplySupported);
  const sdkSupported = supported.filter(
    (proposal) => proposal.field !== "externalProviderIds"
  );
  const editorSupported = supported.filter(
    (proposal) => proposal.field === "externalProviderIds"
  );
  const skipped = proposals.length - supported.length;
  const errors: string[] = [];
  let applied = 0;

  if (supported.length === 0) {
    return {
      applied: 0,
      skipped,
      errors: []
    };
  }

  if (sdkSupported.length > 0) {
    const sdk = getWmeSdk();

    if (!sdk) {
      errors.push("WME SDK is not available");
    } else {
      const editorLockLevel = getCurrentEditorLockLevel();
      const args = buildUpdateArgs(
        venueId,
        currentServices,
        currentAliases,
        sdkSupported,
        editorLockLevel
      );

      try {
        sdk.DataModel.Venues.updateVenue(args);
        applied += sdkSupported.length;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown apply error";

        logger.error(`Failed to apply SDK proposals: ${message}`);
        errors.push(message);
      }
    }
  }

  for (const proposal of editorSupported) {
    const appliedInEditor = await applyExternalProviderProposalInEditor(proposal);

    if (appliedInEditor) {
      applied += 1;
      continue;
    }

    errors.push("Could not select the suggested external provider in the editor");
  }

  logger.info(`Applied ${applied} proposal(s) to venue ${venueId}`);

  return {
    applied,
    skipped,
    errors
  };
}
