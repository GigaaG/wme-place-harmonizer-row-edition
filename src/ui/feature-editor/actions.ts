import type { PlaceProposal } from "../../types/proposal";
import { getFeatureEditorContainer } from "./container.ts";

export function getSelectedProposals(
  proposals: PlaceProposal[]
): PlaceProposal[] {
  const queryRoot: ParentNode = getFeatureEditorContainer() ?? document;
  const selectedInputs = [
    ...Array.from(
      queryRoot.querySelectorAll<HTMLInputElement>(
        ".wmeph-row-apply-checkbox:checked"
      )
    ),
    ...Array.from(
      queryRoot.querySelectorAll<HTMLInputElement>(
        ".wmeph-row-apply-radio:checked"
      )
    )
  ];

  const selectedIds = new Set(
    selectedInputs
      .map((input) => input.dataset.proposalId ?? "")
      .filter((proposalId) => proposalId.length > 0)
  );

  return proposals.filter(
    (proposal) => proposal.id && selectedIds.has(proposal.id)
  );
}
