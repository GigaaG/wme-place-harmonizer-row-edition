import assert from "node:assert/strict";

import { getSelectedProposals } from "../src/ui/feature-editor/actions.ts";
import type { PlaceProposal } from "../src/types/proposal.ts";

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest("collects selected checkbox and radio proposals from the feature editor", () => {
  const originalDocument = globalThis.document;
  const proposals: PlaceProposal[] = [
    {
      id: "name-fix",
      field: "name",
      proposedValue: "Albert Heijn",
      reason: "Normalize name",
      isApplySupported: true,
      actionType: "set-field"
    },
    {
      id: "provider-1",
      field: "externalProviderIds",
      proposedValue: ["provider-1"],
      reason: "Damrak 1 | 10 m away",
      isApplySupported: true,
      actionType: "set-field",
      externalProviderTargetId: "provider-1"
    },
    {
      id: "provider-2",
      field: "externalProviderIds",
      proposedValue: ["provider-2"],
      reason: "Damrak 2 | 20 m away",
      isApplySupported: true,
      actionType: "set-field",
      externalProviderTargetId: "provider-2"
    }
  ];

  globalThis.document = {
    querySelectorAll(selector: string) {
      if (selector === ".wmeph-row-apply-checkbox:checked") {
        return [
          {
            dataset: { proposalId: "name-fix" }
          }
        ] as unknown as NodeListOf<HTMLInputElement>;
      }

      if (selector === ".wmeph-row-apply-radio:checked") {
        return [
          {
            dataset: { proposalId: "provider-2" }
          }
        ] as unknown as NodeListOf<HTMLInputElement>;
      }

      return [] as unknown as NodeListOf<HTMLInputElement>;
    }
  } as Document;

  try {
    const selected = getSelectedProposals(proposals);

    assert.deepEqual(
      selected.map((proposal) => proposal.id),
      ["name-fix", "provider-2"]
    );
  } finally {
    globalThis.document = originalDocument;
  }
});
