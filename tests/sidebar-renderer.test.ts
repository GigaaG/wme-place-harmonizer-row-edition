import assert from "node:assert/strict";

import "./test-i18n.ts";
import { renderSidebarDebugPanel } from "../src/ui/sidebar/renderer.ts";
import { removeScriptSidebarTab } from "../src/ui/sidebar/script-tab.ts";
import type { SidebarDebugState } from "../src/app/app-state.ts";

function buildGoogleMapsValidationChecks() {
  return {
    notFound: true,
    closed: true,
    locationDrift: true,
    nameMismatch: true,
    category: true,
    openingHours: true
  };
}

function buildSidebarState(googleValidationEnabled: boolean): SidebarDebugState {
  return {
    scriptName: "WME Place Harmonizer ROW Edition",
    dataChannel: "dev",
    manifestVersion: "1.0.0",
    manifestRevision: "rev-test",
    runtimeConfigId: "global",
    runtimeConfigVersion: 1,
    runtimeChainsId: "global",
    runtimeChainsCount: 1,
    highlightsEnabled: true,
    autoScanVisibleVenues: true,
    disableNaturalFeaturesHighlighting: false,
    googleMapsValidation: {
      enabled: googleValidationEnabled,
      checks: buildGoogleMapsValidationChecks()
    },
    googleMapsValidationAvailability: {
      enabled: true,
      checks: buildGoogleMapsValidationChecks()
    }
  };
}

function runTest(name: string, fn: () => Promise<void>): Promise<void> {
  return fn()
    .then(() => {
      console.log(`PASS ${name}`);
    })
    .catch((error) => {
      console.error(`FAIL ${name}`);
      throw error;
    });
}

async function renderSidebarHtml(state: SidebarDebugState): Promise<string> {
  const hostGlobal = globalThis as typeof globalThis & {
    window?: Window & {
      getWmeSdk?: () => {
        Sidebar: {
          registerScriptTab: () => Promise<{
            tabLabel: HTMLElement;
            tabPane: HTMLElement;
          }>;
          removeScriptTab: () => void;
        };
      };
    };
    unsafeWindow?: Window & {
      getWmeSdk?: () => {
        Sidebar: {
          registerScriptTab: () => Promise<{
            tabLabel: HTMLElement;
            tabPane: HTMLElement;
          }>;
          removeScriptTab: () => void;
        };
      };
    };
  };
  const tabPane = { innerHTML: "" } as HTMLElement;
  const hostWindow =
    hostGlobal.window ??
    ({} as Window & {
      getWmeSdk?: () => {
        Sidebar: {
          registerScriptTab: () => Promise<{
            tabLabel: HTMLElement;
            tabPane: HTMLElement;
          }>;
          removeScriptTab: () => void;
        };
      };
    });
  const originalWindowGetWmeSdk = hostWindow.getWmeSdk;
  const originalUnsafeWindowGetWmeSdk = hostGlobal.unsafeWindow?.getWmeSdk;

  hostGlobal.window = hostWindow;
  hostWindow.getWmeSdk = () => ({
    Sidebar: {
      async registerScriptTab() {
        return {
          tabLabel: {
            textContent: "",
            title: ""
          } as HTMLElement,
          tabPane
        };
      },
      removeScriptTab() {
        return undefined;
      }
    }
  });

  if (hostGlobal.unsafeWindow) {
    hostGlobal.unsafeWindow.getWmeSdk = hostWindow.getWmeSdk;
  }

  try {
    await renderSidebarDebugPanel(state);
    return tabPane.innerHTML;
  } finally {
    removeScriptSidebarTab();

    if (originalWindowGetWmeSdk) {
      hostWindow.getWmeSdk = originalWindowGetWmeSdk;
    } else {
      delete hostWindow.getWmeSdk;
    }

    if (hostGlobal.unsafeWindow) {
      if (originalUnsafeWindowGetWmeSdk) {
        hostGlobal.unsafeWindow.getWmeSdk = originalUnsafeWindowGetWmeSdk;
      } else {
        delete hostGlobal.unsafeWindow.getWmeSdk;
      }
    }
  }
}

await runTest("renders Google validation child settings when validation is enabled", async () => {
  const html = await renderSidebarHtml(buildSidebarState(true));

  assert.equal(html.includes("Enabled checks"), true);
  assert.equal(html.includes("wmeph-row-google-validation-notFound"), true);
});

await runTest("moves debug metadata into the info tooltip", async () => {
  const html = await renderSidebarHtml(buildSidebarState(true));

  assert.equal(html.includes('id="wmeph-row-debug-info"'), true);
  assert.equal(html.includes("Channel: dev"), true);
  assert.equal(html.includes("Manifest: 1.0.0 / rev-test"), true);
  assert.equal(html.includes("Runtime Config: global v1"), true);
  assert.equal(html.includes("Chains: global (1)"), true);
  assert.equal(html.includes("<b>Channel</b><br>"), false);
  assert.equal(html.includes("<b>Manifest</b><br>"), false);
  assert.equal(html.includes("<b>Runtime Config</b><br>"), false);
  assert.equal(html.includes("<b>Chains</b><br>"), false);
});

await runTest("hides Google validation child settings when validation is disabled", async () => {
  const html = await renderSidebarHtml(buildSidebarState(false));

  assert.equal(html.includes("Enabled checks"), false);
  assert.equal(html.includes("wmeph-row-google-validation-notFound"), false);
});

await runTest("renders the natural-features highlight toggle", async () => {
  const html = await renderSidebarHtml({
    ...buildSidebarState(true),
    disableNaturalFeaturesHighlighting: true
  });

  assert.equal(html.includes("wmeph-row-natural-features-highlight-toggle"), true);
  assert.equal(
    html.includes("Disable NATURAL_FEATURES highlighting (including child categories)"),
    true
  );
  assert.match(
    html,
    /id="wmeph-row-natural-features-highlight-toggle"[^>]*checked/
  );
});
