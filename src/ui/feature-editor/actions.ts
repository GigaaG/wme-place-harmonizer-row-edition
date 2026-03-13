import type { PlaceProposal } from "../../types/proposal";

export function getSelectedProposals(
  proposals: PlaceProposal[]
): PlaceProposal[] {
  const checkboxes = Array.from(
    document.querySelectorAll<HTMLInputElement>(".wmeph-row-apply-checkbox")
  );

  const selectedIds = new Set(
    checkboxes
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.dataset.proposalId ?? "")
      .filter((proposalId) => proposalId.length > 0)
  );

  return proposals.filter(
    (proposal) => proposal.id && selectedIds.has(proposal.id)
  );
}
