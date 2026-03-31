import assert from "node:assert/strict";

import { renderFeatureEditorAnalysis } from "../src/ui/feature-editor/renderer.ts";
import type { PlaceIssue } from "../src/types/issue.ts";
import type { PlaceProposal } from "../src/types/proposal.ts";
import type { PendingWhitelistRenderAction } from "../src/ui/feature-editor/renderer.ts";

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function renderAnalysisHtml(params: {
  issues: PlaceIssue[];
  proposals: PlaceProposal[];
  pendingWhitelistActions?: PendingWhitelistRenderAction[];
}): string {
  const originalDocument = globalThis.document;
  const elements = new Map<string, HTMLElement>();
  const anchor = {
    parentElement: {
      insertBefore(node: HTMLElement) {
        elements.set(node.id, node);
      }
    }
  } as Element;

  globalThis.document = {
    getElementById(id: string) {
      return elements.get(id) ?? null;
    },
    querySelector(selector: string) {
      if (
        selector === "#edit-panel > div > div > div > wz-section-header" ||
        selector === "#edit-panel wz-section-header"
      ) {
        return anchor;
      }

      return null;
    },
    createElement() {
      return {
        id: "",
        innerHTML: "",
        style: {},
        remove() {
          if (this.id) {
            elements.delete(this.id);
          }
        }
      } as HTMLElement;
    }
  } as Document;

  try {
    renderFeatureEditorAnalysis(
      "Test Venue",
      null,
      params.issues,
      params.proposals,
      undefined,
      params.pendingWhitelistActions ?? []
    );

    return elements.get("wmeph-row-feature-editor")?.innerHTML ?? "";
  } finally {
    globalThis.document = originalDocument;
  }
}

function buildIssue(): PlaceIssue {
  return {
    field: "name",
    severity: "warning",
    message: "Name needs normalization",
    groupKey: "name::normalize",
    ruleId: "normalize-name"
  };
}

function buildProposal(): PlaceProposal {
  return {
    id: "name-fix",
    field: "name",
    groupKey: "name::normalize",
    proposedValue: "Albert Heijn",
    reason: "Normalize name",
    isApplySupported: true,
    actionType: "set-field"
  };
}

runTest("renders ignore as a compact inline action", () => {
  const html = renderAnalysisHtml({
    issues: [buildIssue()],
    proposals: [buildProposal()]
  });

  assert.equal(html.includes('class="wmeph-row-whitelist-issue"'), true);
  assert.match(html, />\s*Ignore\s*</);
  assert.equal(html.includes("Ignore for this venue"), false);
  assert.equal(html.includes("justify-content:flex-end"), true);
  assert.equal(html.includes("background:none;border:none;padding:0"), true);
});

runTest("renders pending ignore with compact status and countdown", () => {
  const html = renderAnalysisHtml({
    issues: [buildIssue()],
    proposals: [buildProposal()],
    pendingWhitelistActions: [
      {
        groupKey: "name::normalize",
        field: "name",
        severity: "warning",
        message: "Name needs normalization",
        expiresInSeconds: 5
      }
    ]
  });

  assert.equal(html.includes("Ignoring..."), true);
  assert.equal(html.includes("Undo (5s)"), true);
  assert.equal(
    html.includes("This finding will be ignored in 5s unless you undo it"),
    false
  );
  assert.equal(html.includes("justify-content:space-between"), true);
  assert.match(html, /<div><b>Findings<\/b><\/div>\s*<div>1<\/div>/);
});
