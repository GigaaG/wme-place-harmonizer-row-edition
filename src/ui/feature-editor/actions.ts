import type { PlaceProposal } from "../../types/proposal";

export function getSelectedProposals(
  proposals: PlaceProposal[]
): PlaceProposal[] {
  const checkboxes = Array.from(
    document.querySelectorAll<HTMLInputElement>(".wmeph-row-apply-checkbox")
  );

  const selectedKeys = new Set(
    checkboxes
      .filter((checkbox) => checkbox.checked)
      .map(
        (checkbox) =>
          `${checkbox.dataset.field ?? ""}::${checkbox.dataset.ruleId ?? ""}`
      )
  );

  return proposals.filter((proposal) =>
    selectedKeys.has(`${proposal.field}::${proposal.issueRuleId ?? ""}`)
  );
}
