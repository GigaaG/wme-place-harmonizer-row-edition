import assert from "node:assert/strict";

import {
  renderHighlights,
  resetHighlighterStateForTests
} from "../src/highlighter/highlighter-manager.ts";
import type { VisibleVenueScanSummary } from "../src/types/scan.ts";

function runTest(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`PASS ${name}`);
    })
    .catch((error) => {
      console.error(`FAIL ${name}`);
      throw error;
    });
}

function buildSummary(): VisibleVenueScanSummary {
  return {
    total: 1,
    ok: 0,
    warning: 1,
    error: 0,
    results: [
      {
        venueId: "venue-1",
        name: "Test Venue",
        issueCount: 1,
        hasErrors: false,
        hasWarnings: true,
        severity: "warning"
      }
    ]
  };
}

function buildPointVenue() {
  return {
    id: "venue-1",
    geometry: {
      type: "Point",
      coordinates: [4.9, 52.37]
    },
    categories: ["PARK"]
  };
}

async function withMockedSdk(
  zoomLevel: number,
  callback: (state: { captured: { addedLayer: any; addedFeatures: any[] } }) => void | Promise<void>
): Promise<void> {
  const hostWindow = globalThis as typeof globalThis & {
    window?: any;
    unsafeWindow?: any;
  };
  const previousUnsafeWindow = hostWindow.unsafeWindow;
  const targetWindow = hostWindow.window ?? (hostWindow.window = {});
  const previousGetWmeSdk = targetWindow.getWmeSdk;
  const captured = {
    addedLayer: undefined as any,
    addedFeatures: [] as any[]
  };

  const sdk = {
    Map: {
      getZoomLevel: () => zoomLevel,
      addLayer: (layer: any) => {
        captured.addedLayer = layer;
      },
      addFeaturesToLayer: ({ features }: { features: any[] }) => {
        captured.addedFeatures = features;
      },
      removeFeatureFromLayer: () => undefined
    },
    LayerSwitcher: {
      addLayerCheckbox: () => undefined
    }
  };

  targetWindow.getWmeSdk = () => sdk;
  hostWindow.unsafeWindow = undefined;
  resetHighlighterStateForTests();

  try {
    await callback({ captured });
  } finally {
    resetHighlighterStateForTests();

    if (previousGetWmeSdk === undefined) {
      delete targetWindow.getWmeSdk;
    } else {
      targetWindow.getWmeSdk = previousGetWmeSdk;
    }

    hostWindow.unsafeWindow = previousUnsafeWindow;
  }
}

await runTest("uses a radius of 10 for point highlights at zoom level 17", async () => {
  await withMockedSdk(17, async ({ captured }) => {
    const result = renderHighlights(buildSummary(), [buildPointVenue()]);

    assert.equal(result.renderedFeatureCount, 1);
    assert.equal("pointRadius" in (captured.addedFeatures[0]?.properties ?? {}), false);
    assert.equal(
      captured.addedLayer.styleRules.some(
        (rule: any) =>
          rule.predicate({
            severity: "warning",
            geometryKind: "point"
          }, 17) && rule.style.pointRadius === 10
      ),
      true
    );
  });
});

await runTest("uses a radius of 14 for point highlights above zoom level 17", async () => {
  await withMockedSdk(18, async ({ captured }) => {
    const result = renderHighlights(buildSummary(), [buildPointVenue()]);

    assert.equal(result.renderedFeatureCount, 1);
    assert.equal("pointRadius" in (captured.addedFeatures[0]?.properties ?? {}), false);
    assert.equal(
      captured.addedLayer.styleRules.some(
        (rule: any) =>
          rule.predicate({
            severity: "warning",
            geometryKind: "point"
          }, 18) && rule.style.pointRadius === 14
      ),
      true
    );
  });
});
