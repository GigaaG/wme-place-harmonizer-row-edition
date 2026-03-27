import type { PlaceProposal } from "../../types/proposal";

export function getSelectedProposals(
  proposals: PlaceProposal[]
): PlaceProposal[] {
  const selectedInputs = [
    ...Array.from(
      document.querySelectorAll<HTMLInputElement>(
        ".wmeph-row-apply-checkbox:checked"
      )
    ),
    ...Array.from(
      document.querySelectorAll<HTMLInputElement>(
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
